import { DateTime } from 'luxon';
import { toZonedDateTime } from './slot-generator.js';
import { AppError } from '../lib/errors.js';
import { incrementMonthlyUsage, getTenantEntitlements, checkMonthlyLimit } from './entitlements-service.js';
import { writeAudit } from './audit-service.js';

function overlapClause(columnStart = 'start_at', columnEnd = 'end_at') {
  return `NOT ($2 >= ${columnEnd} OR $3 <= ${columnStart})`;
}

/**
 * Check whether a requested booking window falls within an open availability
 * window for the resource on that date.
 *
 * Returns true if the booking is permitted, false if outside open hours.
 * If no rules are defined for the resource, defaults to PERMISSIVE (true)
 * so existing bookings aren't broken during migration.
 */
async function isWithinAvailableHours(client, resourceId, timezone, startAt, endAt) {
  const dateStr = DateTime.fromJSDate(startAt, { zone: timezone }).toFormat('yyyy-MM-dd');
  const dayOfWeek = DateTime.fromJSDate(startAt, { zone: timezone }).weekday % 7;

  // Load rules for this day
  const rulesResult = await client.query(
    `SELECT * FROM public.availability_rules
      WHERE resource_id = $1
        AND day_of_week = $2
        AND is_open = true`,
    [resourceId, dayOfWeek]
  );

  // No rules configured — permissive fallback
  if (rulesResult.rows.length === 0) return true;

  // Check for a closure exception on this date
  const exceptionResult = await client.query(
    `SELECT * FROM public.availability_exceptions
      WHERE resource_id = $1
        AND exception_date = $2::date`,
    [resourceId, dateStr]
  );

  const exceptions = exceptionResult.rows;

  // Full closure exception — deny
  if (exceptions.some((e) => e.is_closed)) return false;

  // Determine which windows apply: exception windows or rule windows
  const windows = exceptions.length > 0
    ? exceptions
        .filter((e) => e.start_time && e.end_time)
        .map((e) => ({
          start: toZonedDateTime(dateStr, e.start_time, timezone),
          end:   toZonedDateTime(dateStr, e.end_time,   timezone),
        }))
    : rulesResult.rows.map((r) => ({
        start: toZonedDateTime(dateStr, r.start_time, timezone),
        end:   toZonedDateTime(dateStr, r.end_time,   timezone),
      }));

  const bookingStart = DateTime.fromJSDate(startAt, { zone: timezone });
  const bookingEnd   = DateTime.fromJSDate(endAt,   { zone: timezone });

  // Booking must fit entirely within at least one open window
  return windows.some((w) => bookingStart >= w.start && bookingEnd <= w.end);
}

export async function validateBookingRequest(client, tenantId, payload) {
  const {
    resource_id,
    start_at,
    end_at,
    quantity = 1
  } = payload;

  if (!resource_id || !start_at || !end_at) {
    throw new AppError(400, 'resource_id, start_at and end_at are required.');
  }

  const startAt = new Date(start_at);
  const endAt = new Date(end_at);
  if (!(startAt instanceof Date) || Number.isNaN(startAt.getTime()) || !(endAt instanceof Date) || Number.isNaN(endAt.getTime())) {
    throw new AppError(400, 'Invalid booking datetime supplied.');
  }
  if (endAt <= startAt) {
    throw new AppError(400, 'end_at must be after start_at.');
  }

  const resourceResult = await client.query(
    `SELECT id, tenant_id, name, timezone, is_active, capacity, booking_mode,
            max_booking_duration_hours, min_notice_hours, max_advance_booking_days,
            buffer_before_minutes, buffer_after_minutes
       FROM public.resources
      WHERE id = $1
        AND tenant_id = $2
        FOR UPDATE`,
    [resource_id, tenantId]
  );
  const resource = resourceResult.rows[0];
  if (!resource) throw new AppError(404, 'Resource not found.');
  if (!resource.is_active) throw new AppError(409, 'Resource is inactive.');

  // Availability rules check — placed here because resource must be loaded first
  const withinHours = await isWithinAvailableHours(
    client,
    resource_id,
    resource.timezone || 'UTC',
    startAt,
    endAt
  );
  if (!withinHours) {
    throw new AppError(409, 'Booking falls outside of available hours for this resource.');
  }

  const hoursRequested = (endAt.getTime() - startAt.getTime()) / 3600000;
  if (resource.max_booking_duration_hours && hoursRequested > Number(resource.max_booking_duration_hours)) {
    throw new AppError(409, 'Booking exceeds maximum duration for this resource.');
  }

  const noticeHours = (startAt.getTime() - Date.now()) / 3600000;
  if (noticeHours < Number(resource.min_notice_hours || 0)) {
    throw new AppError(409, 'Booking does not meet minimum notice requirement.');
  }

  if (resource.max_advance_booking_days != null) {
    const advanceDays = (startAt.getTime() - Date.now()) / 86400000;
    if (advanceDays > Number(resource.max_advance_booking_days)) {
      throw new AppError(409, 'Booking is too far in advance for this resource.');
    }
  }

  const bufferBefore = Number(resource.buffer_before_minutes || 0);
  const bufferAfter = Number(resource.buffer_after_minutes || 0);
  const effectiveStart = new Date(startAt.getTime() - bufferBefore * 60000);
  const effectiveEnd = new Date(endAt.getTime() + bufferAfter * 60000);

  const blockResult = await client.query(
    `SELECT id
       FROM public.unavailability_blocks
      WHERE resource_id = $1
        AND ${overlapClause('start_at', 'end_at')}
      LIMIT 1`,
    [resource_id, effectiveStart, effectiveEnd]
  );
  if (blockResult.rowCount > 0) {
    throw new AppError(409, 'Booking overlaps an unavailable period.');
  }

  const capacityResult = await client.query(
    `SELECT COALESCE(SUM(quantity), 0) AS booked_quantity
       FROM public.bookings
      WHERE resource_id = $1
        AND status IN ('provisional', 'confirmed')
        AND ${overlapClause('start_at', 'end_at')}`,
    [resource_id, effectiveStart, effectiveEnd]
  );
  const alreadyBooked = Number(capacityResult.rows[0].booked_quantity || 0);
  if (alreadyBooked + Number(quantity) > Number(resource.capacity)) {
    throw new AppError(409, 'Booking exceeds remaining resource capacity.');
  }

  const entitlements = await getTenantEntitlements(client, tenantId);
  const monthlyLimit = entitlements.limits['bookings:monthly'];
  const monthlyUsage = entitlements.usage.bookings?.usage_value || 0;
  if (!checkMonthlyLimit(monthlyUsage, monthlyLimit, 1)) {
    throw new AppError(402, 'Monthly booking limit reached for this tenant.');
  }

  return { resource, startAt, endAt };
}

export async function createBooking(client, tenantId, actorUserId, payload, options = {}) {
  const validated = await validateBookingRequest(client, tenantId, payload);
  const status = options.status || payload.status || 'provisional';

  const result = await client.query(
    `INSERT INTO public.bookings (
      tenant_id,
      resource_id,
      created_by_user_id,
      public_reference,
      status,
      customer_name,
      customer_email,
      customer_phone,
      start_at,
      end_at,
      quantity,
      notes,
      metadata
    ) VALUES (
      $1, $2, $3, COALESCE($4, encode(gen_random_bytes(6), 'hex')), $5,
      $6, $7, $8, $9, $10, $11, $12, COALESCE($13::jsonb, '{}'::jsonb)
    )
    RETURNING *`,
    [
      tenantId,
      payload.resource_id,
      actorUserId || null,
      payload.public_reference || null,
      status,
      payload.customer_name,
      payload.customer_email || null,
      payload.customer_phone || null,
      validated.startAt,
      validated.endAt,
      Number(payload.quantity || 1),
      payload.notes || null,
      JSON.stringify(payload.metadata || {})
    ]
  );

  await incrementMonthlyUsage(client, tenantId, 'bookings', 1);
  await writeAudit(client, tenantId, actorUserId, 'booking', result.rows[0].id, 'created', {
    status,
    resource_id: payload.resource_id
  });
  return result.rows[0];
}
