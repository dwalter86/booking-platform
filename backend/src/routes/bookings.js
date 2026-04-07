import { Router } from 'express';
import { asyncHandler, AppError } from '../lib/errors.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { withTenantContext } from '../lib/db.js';
import { createBooking } from '../services/booking-service.js';
import { writeAudit } from '../services/audit-service.js';

const router = Router();

function parseStatus(value) {
  const allowed = new Set(['provisional', 'confirmed', 'cancelled']);
  return allowed.has(value) ? value : null;
}

async function getBookingWithResource(client, tenantId, bookingId) {
  const result = await client.query(
    `SELECT
       b.id,
       b.tenant_id,
       b.resource_id,
       r.name AS resource_name,
       b.status,
       b.start_at,
       b.end_at,
       b.party_size,
       b.customer_name,
       b.customer_email,
       b.customer_phone,
       b.notes,
       b.source,
       b.public_reference AS reference_code,
       b.confirmed_at,
       b.cancelled_at,
       b.cancellation_reason,
       b.created_by_user_id,
       b.created_at,
       b.updated_at
     FROM public.bookings b
     LEFT JOIN public.resources r
       ON r.id = b.resource_id
      AND r.tenant_id = b.tenant_id
     WHERE b.tenant_id = $1
       AND b.id = $2`,
    [tenantId, bookingId]
  );

  if (!result.rowCount) throw new AppError(404, 'Booking not found.');
  return result.rows[0];
}

async function validateCapacityForConfirmation(client, booking) {
  const resourceResult = await client.query(
    `SELECT id, name, capacity, is_active
       FROM public.resources
      WHERE tenant_id = $1
        AND id = $2`,
    [booking.tenant_id, booking.resource_id]
  );

  if (!resourceResult.rowCount) {
    throw new AppError(404, 'Resource not found for booking.');
  }

  const resource = resourceResult.rows[0];
  if (!resource.is_active) {
    throw new AppError(400, 'Cannot confirm booking for an inactive resource.');
  }

  const blocks = await client.query(
    `SELECT id
       FROM public.unavailability_blocks
      WHERE tenant_id = $1
        AND resource_id = $2
        AND tstzrange(start_at, end_at, '[)') && tstzrange($3::timestamptz, $4::timestamptz, '[)')
      LIMIT 1`,
    [booking.tenant_id, booking.resource_id, booking.start_at, booking.end_at]
  );

  if (blocks.rowCount > 0) {
    throw new AppError(400, 'Cannot confirm booking because it overlaps an unavailability block.');
  }

  const overlaps = await client.query(
    `SELECT COALESCE(SUM(COALESCE(party_size, 1)), 0) AS total
       FROM public.bookings
      WHERE tenant_id = $1
        AND resource_id = $2
        AND id <> $3
        AND status = 'confirmed'
        AND tstzrange(start_at, end_at, '[)') && tstzrange($4::timestamptz, $5::timestamptz, '[)')`,
    [booking.tenant_id, booking.resource_id, booking.id, booking.start_at, booking.end_at]
  );

  const confirmedLoad = Number(overlaps.rows[0]?.total || 0);
  const requestedLoad = Number(booking.party_size || 1);
  const capacity = Number(resource.capacity || 1);

  if (confirmedLoad + requestedLoad > capacity) {
    throw new AppError(400, 'Cannot confirm booking because capacity would be exceeded.');
  }
}

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const status = parseStatus(String(req.query?.status || '').trim());
  const resourceId = String(req.query?.resource_id || '').trim() || null;
  const dateFrom = String(req.query?.date_from || '').trim() || null;
  const dateTo = String(req.query?.date_to || '').trim() || null;
  const bookingId = String(req.query?.booking_id || '').trim() || null;
  const page = Math.max(1, Number.parseInt(req.query?.page ?? '1', 10) || 1);
  const perPage = Math.min(100, Math.max(1, Number.parseInt(req.query?.per_page ?? '50', 10) || 50));
  const offset = (page - 1) * perPage;

  const result = await withTenantContext(req.auth.tenant_id, async (client) => {
    const where = ['b.tenant_id = $1'];
    const params = [req.auth.tenant_id];

    if (status) {
      params.push(status);
      where.push(`b.status = $${params.length}`);
    }

    if (resourceId) {
      params.push(resourceId);
      where.push(`b.resource_id = $${params.length}`);
    }

    if (dateFrom) {
      params.push(dateFrom);
      where.push(`b.start_at >= $${params.length}::timestamptz`);
    }

    if (dateTo) {
      params.push(dateTo);
      where.push(`b.start_at <= $${params.length}::timestamptz`);
    }

    if (bookingId) {
      params.push(bookingId);
      where.push(`b.id = $${params.length}`);
    }

    params.push(perPage);
    params.push(offset);

    const query = await client.query(
      `SELECT
         b.id,
         b.tenant_id,
         b.resource_id,
         r.name AS resource_name,
         b.status,
         b.start_at,
         b.end_at,
         b.party_size,
         b.customer_name,
         b.customer_email,
         b.customer_phone,
         b.notes,
         b.source,
         b.public_reference AS reference_code,
         b.confirmed_at,
         b.cancelled_at,
         b.cancellation_reason,
         b.created_by_user_id,
         b.created_at,
         b.updated_at,
         COUNT(*) OVER() AS total_count
       FROM public.bookings b
       LEFT JOIN public.resources r
         ON r.id = b.resource_id
        AND r.tenant_id = b.tenant_id
       WHERE ${where.join(' AND ')}
       ORDER BY b.start_at DESC, b.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const totalCount = query.rows.length > 0 ? Number(query.rows[0].total_count) : 0;
    const rows = query.rows.map(({ total_count, ...row }) => row);
    return { rows, totalCount };
  });

  res.json({
    data: result.rows,
    pagination: {
      page,
      per_page: perPage,
      total_count: result.totalCount,
      total_pages: Math.ceil(result.totalCount / perPage)
    }
  });
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const booking = await withTenantContext(req.auth.tenant_id, async (client) => {
    return getBookingWithResource(client, req.auth.tenant_id, req.params.id);
  });

  res.json(booking);
}));

router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const created = await withTenantContext(req.auth.tenant_id, async (client) => {
    return createBooking(client, req.auth.tenant_id, req.auth.sub, req.body || {}, {
      status: req.body?.status || 'confirmed'
    });
  });
  res.status(201).json(created);
}));

router.post('/:id/confirm', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const booking = await withTenantContext(req.auth.tenant_id, async (client) => {
    const existing = await getBookingWithResource(client, req.auth.tenant_id, req.params.id);

    if (existing.status === 'cancelled') {
      throw new AppError(400, 'Cancelled bookings cannot be confirmed.');
    }
    if (existing.status === 'confirmed') {
      return existing;
    }

    await validateCapacityForConfirmation(client, existing);

    const result = await client.query(
      `UPDATE public.bookings
          SET status = 'confirmed',
              confirmed_at = now(),
              cancelled_at = NULL,
              cancellation_reason = NULL,
              updated_at = now()
        WHERE tenant_id = $1
          AND id = $2
        RETURNING *`,
      [req.auth.tenant_id, req.params.id]
    );

    await writeAudit(client, req.auth.tenant_id, req.auth.sub, 'booking', req.params.id, 'confirmed', {
      previous_status: existing.status
    });

    return getBookingWithResource(client, req.auth.tenant_id, result.rows[0].id);
  });

  res.json(booking);
}));

router.post('/:id/cancel', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const reason = String(req.body?.reason || '').trim() || null;

  const booking = await withTenantContext(req.auth.tenant_id, async (client) => {
    const existing = await getBookingWithResource(client, req.auth.tenant_id, req.params.id);

    if (existing.status === 'cancelled') {
      throw new AppError(400, 'Booking is already cancelled.');
    }

    const result = await client.query(
      `UPDATE public.bookings
          SET status = 'cancelled',
              cancelled_at = now(),
              cancellation_reason = $3,
              updated_at = now()
        WHERE tenant_id = $1
          AND id = $2
        RETURNING *`,
      [req.auth.tenant_id, req.params.id, reason]
    );

    await writeAudit(client, req.auth.tenant_id, req.auth.sub, 'booking', req.params.id, 'cancelled', {
      previous_status: existing.status,
      reason
    });

    return getBookingWithResource(client, req.auth.tenant_id, result.rows[0].id);
  });

  res.json(booking);
}));

export default router;
