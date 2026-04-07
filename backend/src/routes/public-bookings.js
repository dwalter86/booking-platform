import { Router } from 'express';
import { withTransaction } from '../lib/db.js';
import { AppError } from '../lib/errors.js';
import { resolveTenant } from '../middleware/tenant.js';

const router = Router();

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

router.get('/resources', resolveTenant, async (req, res, next) => {
  try {
    if (!req.tenant) throw new AppError(400, 'Unable to resolve tenant from subdomain/header.');

    const resourcesResult = await withTransaction(async (client) => {
      await client.query('SELECT app.set_current_tenant($1)', [req.tenant.id]);

      return await client.query(
        `SELECT id, name, description, capacity, booking_mode, max_booking_hours, is_active, created_at, updated_at
           FROM resources
          WHERE tenant_id = $1
            AND is_active = true
          ORDER BY name ASC`,
        [req.tenant.id]
      );
    });

    res.json({
      tenant: {
        id: req.tenant.id,
        name: req.tenant.name,
        slug: req.tenant.slug,
        subdomain: req.tenant.subdomain
      },
      resources: resourcesResult.rows
    });
  } catch (error) {
    next(error);
  }
});

router.post('/request', resolveTenant, async (req, res, next) => {
  try {
    if (!req.tenant) throw new AppError(400, 'Unable to resolve tenant from subdomain/header.');

    const resourceId = String(req.body?.resource_id || '').trim();
    const customerName = String(req.body?.customer_name || '').trim();
    const customerEmail = String(req.body?.customer_email || '').trim().toLowerCase();
    const customerPhone = String(req.body?.customer_phone || '').trim();
    const notes = String(req.body?.notes || '').trim();
    const startAtRaw = String(req.body?.start_at || '').trim();
    const endAtRaw = String(req.body?.end_at || '').trim();
    const partySize = Math.max(1, toInt(req.body?.party_size, 1));

    if (!resourceId) throw new AppError(400, 'resource_id is required.');
    if (!customerName) throw new AppError(400, 'customer_name is required.');
    if (!customerEmail) throw new AppError(400, 'customer_email is required.');
    if (!startAtRaw || !endAtRaw) throw new AppError(400, 'start_at and end_at are required.');

    if (customerName.length > 200) throw new AppError(400, 'customer_name must be 200 characters or fewer.');
    if (customerEmail.length > 254) throw new AppError(400, 'customer_email must be 254 characters or fewer.');
    if (customerPhone.length > 50) throw new AppError(400, 'customer_phone must be 50 characters or fewer.');
    if (notes.length > 2000) throw new AppError(400, 'notes must be 2000 characters or fewer.');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) throw new AppError(400, 'customer_email must be a valid email address.');

    const startAt = new Date(startAtRaw);
    const endAt = new Date(endAtRaw);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new AppError(400, 'start_at and end_at must be valid ISO datetimes.');
    }
    if (endAt <= startAt) throw new AppError(400, 'end_at must be after start_at.');

    const result = await withTransaction(async (client) => {
      await client.query('SELECT app.set_current_tenant($1)', [req.tenant.id]);

      const resourceResult = await client.query(
        `SELECT id, tenant_id, name, capacity, booking_mode, max_booking_hours, is_active
           FROM resources
          WHERE tenant_id = $1
            AND id = $2`,
        [req.tenant.id, resourceId]
      );

      const resource = resourceResult.rows[0];
      if (!resource) throw new AppError(404, 'Resource not found.');
      if (!resource.is_active) throw new AppError(400, 'Resource is not active.');

      const durationHours = (endAt.getTime() - startAt.getTime()) / 3600000;
      if (resource.max_booking_hours && durationHours > Number(resource.max_booking_hours)) {
        throw new AppError(400, `Booking exceeds maximum duration of ${resource.max_booking_hours} hours.`);
      }
      if (partySize > Number(resource.capacity || 1)) {
        throw new AppError(400, 'Requested party size exceeds resource capacity.');
      }

      const overlapBlocks = await client.query(
        `SELECT id, start_at, end_at, reason
           FROM unavailability_blocks
          WHERE tenant_id = $1
            AND resource_id = $2
            AND tstzrange(start_at, end_at, '[)') && tstzrange($3::timestamptz, $4::timestamptz, '[)')
          ORDER BY start_at ASC`,
        [req.tenant.id, resource.id, startAt.toISOString(), endAt.toISOString()]
      );

      if (overlapBlocks.rowCount > 0) {
        throw new AppError(400, 'Requested time overlaps an unavailability block.');
      }

      const overlapBookings = await client.query(
        `SELECT id, start_at, end_at, status, party_size
           FROM bookings
          WHERE tenant_id = $1
            AND resource_id = $2
            AND status IN ('provisional', 'confirmed')
            AND tstzrange(start_at, end_at, '[)') && tstzrange($3::timestamptz, $4::timestamptz, '[)')
          ORDER BY start_at ASC`,
        [req.tenant.id, resource.id, startAt.toISOString(), endAt.toISOString()]
      );

      const existingLoad = overlapBookings.rows.reduce((sum, row) => sum + Number(row.party_size || 1), 0);
      if (existingLoad + partySize > Number(resource.capacity || 1)) {
        throw new AppError(400, 'Requested time exceeds remaining capacity for this resource.');
      }

      const inserted = await client.query(
        `INSERT INTO bookings (
           tenant_id,
           resource_id,
           status,
           start_at,
           end_at,
           party_size,
           customer_name,
           customer_email,
           customer_phone,
           notes,
           source,
           created_at,
           updated_at
         ) VALUES (
           $1, $2, 'provisional', $3, $4, $5, $6, $7, $8, $9, 'public', NOW(), NOW()
         )
         RETURNING id, tenant_id, resource_id, status, start_at, end_at, party_size, customer_name, customer_email, customer_phone, notes, source, created_at, updated_at`,
        [
          req.tenant.id,
          resource.id,
          startAt.toISOString(),
          endAt.toISOString(),
          partySize,
          customerName,
          customerEmail,
          customerPhone || null,
          notes || null
        ]
      );

      return { resource, booking: inserted.rows[0] };
    });

    res.status(201).json({
      message: 'Provisional booking request created.',
      booking: result.booking,
      resource: {
        id: result.resource.id,
        name: result.resource.name,
        capacity: result.resource.capacity,
        booking_mode: result.resource.booking_mode,
        max_booking_hours: result.resource.max_booking_hours
      },
      tenant: {
        id: req.tenant.id,
        name: req.tenant.name,
        slug: req.tenant.slug,
        subdomain: req.tenant.subdomain
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
