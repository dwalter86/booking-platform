import { Router } from 'express';
import { withTransaction } from '../lib/db.js';
import { AppError } from '../lib/errors.js';
import { resolveTenant } from '../middleware/tenant.js';

const router = Router();

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// ---------------------------------------------------------------------------
// GET /resources
// ---------------------------------------------------------------------------

router.get('/resources', resolveTenant, async (req, res, next) => {
  try {
    if (!req.tenant) throw new AppError(400, 'Unable to resolve tenant from subdomain/header.');

    const resourcesResult = await withTransaction(async (client) => {
      await client.query('SELECT app.set_current_tenant($1)', [req.tenant.id]);

      return await client.query(
        `SELECT
           r.id,
           r.name,
           r.description,
           r.capacity,
           r.booking_mode,
           r.max_booking_duration_hours,
           r.min_notice_hours,
           r.max_advance_booking_days,
           r.timezone,
           r.is_active,
           r.created_at,
           r.updated_at,
           EXISTS (
             SELECT 1 FROM availability_rules ar
             WHERE ar.resource_id = r.id
               AND ar.is_open = true
           ) AS has_rules
         FROM resources r
         WHERE r.tenant_id = $1
           AND r.is_active = true
         ORDER BY r.name ASC`,
        [req.tenant.id]
      );
    });

    res.json({
      tenant: {
        id: req.tenant.id,
        name: req.tenant.name,
        slug: req.tenant.slug,
        subdomain: req.tenant.subdomain,
        public_booking_enabled: req.tenant.public_booking_enabled,
        logo_url: req.tenant.logo_url,
        brand_colour: req.tenant.brand_colour,
        booking_confirmation_message: req.tenant.booking_confirmation_message
      },
      resources: resourcesResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// POST /draft  — create or update a booking draft, return token
// ---------------------------------------------------------------------------

router.post('/draft', resolveTenant, async (req, res, next) => {
  try {
    if (!req.tenant) throw new AppError(400, 'Unable to resolve tenant from subdomain/header.');

    const token         = String(req.body?.token || '').trim() || null;
    const resourceId    = String(req.body?.resource_id || '').trim() || null;
    const preferredDate = String(req.body?.preferred_date || '').trim() || null;
    const customerName  = String(req.body?.customer_name || '').trim() || null;
    const customerEmail = String(req.body?.customer_email || '').trim().toLowerCase() || null;
    const customerPhone = String(req.body?.customer_phone || '').trim() || null;
    const notes         = String(req.body?.notes || '').trim() || null;
    const partySize     = Math.max(1, toInt(req.body?.party_size, 1));
    const bookingMode   = String(req.body?.booking_mode || '').trim() || null;

    const validModes = ['free', 'availability_only', 'hybrid'];
    if (bookingMode && !validModes.includes(bookingMode)) {
      throw new AppError(400, 'Invalid booking_mode.');
    }

    const draft = await withTransaction(async (client) => {
      await client.query('SELECT app.set_current_tenant($1)', [req.tenant.id]);

      if (token) {
        // Update existing draft if it belongs to this tenant and is not expired
        const updated = await client.query(
          `UPDATE booking_drafts SET
             resource_id    = COALESCE($1, resource_id),
             preferred_date = COALESCE($2::date, preferred_date),
             customer_name  = COALESCE($3, customer_name),
             customer_email = COALESCE($4, customer_email),
             customer_phone = COALESCE($5, customer_phone),
             notes          = COALESCE($6, notes),
             party_size     = $7,
             booking_mode   = COALESCE($8, booking_mode),
             expires_at     = now() + interval '48 hours'
           WHERE token = $9
             AND tenant_id = $10
             AND expires_at > now()
           RETURNING token`,
          [resourceId, preferredDate, customerName, customerEmail,
           customerPhone, notes, partySize, bookingMode, token, req.tenant.id]
        );

        if (updated.rowCount > 0) return updated.rows[0];
        // Token not found or expired — fall through to create new
      }

      // Create new draft
      const inserted = await client.query(
        `INSERT INTO booking_drafts
           (tenant_id, resource_id, preferred_date, customer_name, customer_email,
            customer_phone, notes, party_size, booking_mode)
         VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, $9)
         RETURNING token`,
        [req.tenant.id, resourceId, preferredDate, customerName, customerEmail,
         customerPhone, notes, partySize, bookingMode]
      );

      return inserted.rows[0];
    });

    res.status(201).json({ token: draft.token });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// GET /draft/:token  — fetch a draft for step restoration
// ---------------------------------------------------------------------------

router.get('/draft/:token', resolveTenant, async (req, res, next) => {
  try {
    if (!req.tenant) throw new AppError(400, 'Unable to resolve tenant from subdomain/header.');

    const token = String(req.params.token || '').trim();
    if (!token) throw new AppError(400, 'token is required.');

    const result = await withTransaction(async (client) => {
      await client.query('SELECT app.set_current_tenant($1)', [req.tenant.id]);

      return await client.query(
        `SELECT
           d.token,
           d.resource_id,
           to_char(d.preferred_date, 'YYYY-MM-DD') AS preferred_date,
           d.customer_name,
           d.customer_email,
           d.customer_phone,
           d.party_size,
           d.notes,
           d.booking_mode,
           d.expires_at,
           d.expires_at < now() AS is_expired
         FROM booking_drafts d
         WHERE d.token = $1
           AND d.tenant_id = $2`,
        [token, req.tenant.id]
      );
    });

    if (result.rowCount === 0) throw new AppError(404, 'Draft not found.');

    const draft = result.rows[0];

    if (draft.is_expired) {
      return res.json({ expired: true });
    }

    res.json({
      token:          draft.token,
      resource_id:    draft.resource_id,
      preferred_date: draft.preferred_date,
      customer_name:  draft.customer_name,
      customer_email: draft.customer_email,
      customer_phone: draft.customer_phone,
      party_size:     draft.party_size,
      notes:          draft.notes,
      booking_mode:   draft.booking_mode,
    });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// POST /request  — submit final booking, consume draft if present
// ---------------------------------------------------------------------------

router.post('/request', resolveTenant, async (req, res, next) => {
  try {
    if (!req.tenant) throw new AppError(400, 'Unable to resolve tenant from subdomain/header.');

    const resourceId  = String(req.body?.resource_id || '').trim();
    const customerName  = String(req.body?.customer_name || '').trim();
    const customerEmail = String(req.body?.customer_email || '').trim().toLowerCase();
    const customerPhone = String(req.body?.customer_phone || '').trim();
    const notes         = String(req.body?.notes || '').trim();
    const startAtRaw    = String(req.body?.start_at || '').trim();
    const endAtRaw      = String(req.body?.end_at || '').trim();
    const partySize     = Math.max(1, toInt(req.body?.party_size, 1));
    const draftToken    = String(req.body?.draft_token || '').trim() || null;

    if (!resourceId)           throw new AppError(400, 'resource_id is required.');
    if (!customerName)         throw new AppError(400, 'customer_name is required.');
    if (!customerEmail)        throw new AppError(400, 'customer_email is required.');
    if (!startAtRaw || !endAtRaw) throw new AppError(400, 'start_at and end_at are required.');

    if (customerName.length > 200)  throw new AppError(400, 'customer_name must be 200 characters or fewer.');
    if (customerEmail.length > 254) throw new AppError(400, 'customer_email must be 254 characters or fewer.');
    if (customerPhone.length > 50)  throw new AppError(400, 'customer_phone must be 50 characters or fewer.');
    if (notes.length > 2000)        throw new AppError(400, 'notes must be 2000 characters or fewer.');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) throw new AppError(400, 'customer_email must be a valid email address.');

    const startAt = new Date(startAtRaw);
    const endAt   = new Date(endAtRaw);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new AppError(400, 'start_at and end_at must be valid ISO datetimes.');
    }
    if (endAt <= startAt) throw new AppError(400, 'end_at must be after start_at.');

    const result = await withTransaction(async (client) => {
      await client.query('SELECT app.set_current_tenant($1)', [req.tenant.id]);

      const resourceResult = await client.query(
        `SELECT id, tenant_id, name, capacity, booking_mode,
                max_booking_duration_hours, is_active
           FROM resources
          WHERE tenant_id = $1
            AND id = $2`,
        [req.tenant.id, resourceId]
      );

      const resource = resourceResult.rows[0];
      if (!resource) throw new AppError(404, 'Resource not found.');
      if (!resource.is_active) throw new AppError(400, 'Resource is not active.');

      const durationHours = (endAt.getTime() - startAt.getTime()) / 3600000;
      if (resource.max_booking_duration_hours &&
          durationHours > Number(resource.max_booking_duration_hours)) {
        throw new AppError(400,
          `Booking exceeds maximum duration of ${resource.max_booking_duration_hours} hours.`);
      }

      if (partySize > Number(resource.capacity || 1)) {
        throw new AppError(400, 'Requested party size exceeds resource capacity.');
      }

      const overlapBlocks = await client.query(
        `SELECT id FROM unavailability_blocks
          WHERE tenant_id = $1
            AND resource_id = $2
            AND tstzrange(start_at, end_at, '[)') && tstzrange($3::timestamptz, $4::timestamptz, '[)')`,
        [req.tenant.id, resource.id, startAt.toISOString(), endAt.toISOString()]
      );
      if (overlapBlocks.rowCount > 0) {
        throw new AppError(409, 'Requested time overlaps an unavailability block.');
      }

      const overlapBookings = await client.query(
        `SELECT id, party_size FROM bookings
          WHERE tenant_id = $1
            AND resource_id = $2
            AND status IN ('provisional', 'confirmed')
            AND tstzrange(start_at, end_at, '[)') && tstzrange($3::timestamptz, $4::timestamptz, '[)')`,
        [req.tenant.id, resource.id, startAt.toISOString(), endAt.toISOString()]
      );
      const existingLoad = overlapBookings.rows.reduce(
        (sum, row) => sum + Number(row.party_size || 1), 0
      );
      if (existingLoad + partySize > Number(resource.capacity || 1)) {
        throw new AppError(409, 'Requested time exceeds remaining capacity for this resource.');
      }

      const inserted = await client.query(
        `INSERT INTO bookings (
           tenant_id, resource_id, status, start_at, end_at,
           party_size, customer_name, customer_email, customer_phone,
           notes, source, created_at, updated_at
         ) VALUES (
           $1, $2, 'provisional', $3, $4, $5, $6, $7, $8, $9, 'public', NOW(), NOW()
         )
         RETURNING id, tenant_id, resource_id, status, start_at, end_at,
                   party_size, customer_name, customer_email, customer_phone,
                   notes, source, created_at, updated_at`,
        [
          req.tenant.id, resource.id,
          startAt.toISOString(), endAt.toISOString(),
          partySize, customerName, customerEmail,
          customerPhone || null, notes || null
        ]
      );

      // Consume the draft if one was provided
      if (draftToken) {
        await client.query(
          `DELETE FROM booking_drafts
            WHERE token = $1
              AND tenant_id = $2`,
          [draftToken, req.tenant.id]
        );
      }

      return { resource, booking: inserted.rows[0] };
    });

    res.status(201).json({
      message: 'Provisional booking request created.',
      booking: result.booking,
      resource: {
        id:                         result.resource.id,
        name:                       result.resource.name,
        capacity:                   result.resource.capacity,
        booking_mode:               result.resource.booking_mode,
        max_booking_duration_hours: result.resource.max_booking_duration_hours
      },
      tenant: {
        id:        req.tenant.id,
        name:      req.tenant.name,
        slug:      req.tenant.slug,
        subdomain: req.tenant.subdomain
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
