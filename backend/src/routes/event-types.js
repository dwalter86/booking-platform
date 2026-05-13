import { Router } from 'express';
import { asyncHandler, AppError } from '../lib/errors.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { withTenantContext } from '../lib/db.js';
import { getTenantEntitlements, checkAbsoluteLimit } from '../services/entitlements-service.js';
import { writeAudit } from '../services/audit-service.js';

const router = Router();

const VALID_FORM_TYPES = ['classic', 'minimal', 'split', 'cards'];
const VALID_BOOKING_MODES = ['free', 'slots', 'hybrid'];
const HEX_COLOUR_RE = /^#[0-9a-fA-F]{6}$/;

// GET /api/event-types?resource_id=X
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { resource_id } = req.query;
  const rows = await withTenantContext(req.auth.tenant_id, async (client) => {
    if (resource_id) {
      const result = await client.query(
        `SELECT * FROM public.event_types
          WHERE resource_id = $1 AND tenant_id = $2
          ORDER BY created_at ASC`,
        [resource_id, req.auth.tenant_id]
      );
      return result.rows;
    }
    const result = await client.query(
      `SELECT * FROM public.event_types
        WHERE tenant_id = $1
        ORDER BY created_at ASC`,
      [req.auth.tenant_id]
    );
    return result.rows;
  });
  res.json(rows);
}));

// GET /api/event-types/:id
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const row = await withTenantContext(req.auth.tenant_id, async (client) => {
    const result = await client.query(
      `SELECT * FROM public.event_types
        WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.auth.tenant_id]
    );
    return result.rows[0] || null;
  });
  if (!row) throw new AppError(404, 'Event type not found.');
  res.json(row);
}));

// POST /api/event-types
router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = req.body || {};

  if (!data.resource_id) throw new AppError(400, 'resource_id is required.');
  if (!data.name) throw new AppError(400, 'name is required.');
  if (!data.slug) throw new AppError(400, 'slug is required.');

  const formType = VALID_FORM_TYPES.includes(data.booking_form_type)
    ? data.booking_form_type
    : 'classic';

  const bookingMode = VALID_BOOKING_MODES.includes(data.booking_mode)
    ? data.booking_mode
    : 'free';

  const created = await withTenantContext(req.auth.tenant_id, async (client) => {
    // Verify resource belongs to this tenant
    const resourceResult = await client.query(
      `SELECT id FROM public.resources
        WHERE id = $1 AND tenant_id = $2 AND archived_at IS NULL`,
      [data.resource_id, req.auth.tenant_id]
    );
    if (!resourceResult.rowCount) throw new AppError(404, 'Resource not found.');

    // Check event_types_per_resource entitlement
    const entitlements = await getTenantEntitlements(client, req.auth.tenant_id);
    const limit = entitlements.limits['event_types_per_resource:absolute'];
    const countResult = await client.query(
      `SELECT COUNT(*)::int AS total FROM public.event_types
        WHERE resource_id = $1 AND tenant_id = $2`,
      [data.resource_id, req.auth.tenant_id]
    );
    if (!checkAbsoluteLimit(countResult.rows[0].total, limit)) {
      throw new AppError(402, 'Event type limit reached for this resource. Upgrade your plan to add more.');
    }

    // Check slug is unique within tenant
    const slugCheck = await client.query(
      `SELECT id FROM public.event_types
        WHERE slug = $1 AND tenant_id = $2`,
      [data.slug, req.auth.tenant_id]
    );
    if (slugCheck.rowCount) throw new AppError(409, 'An event type with this slug already exists.');

    const colour = HEX_COLOUR_RE.test(data.colour) ? data.colour : '#1e2a78';

    const result = await client.query(
      `INSERT INTO public.event_types (
         tenant_id, resource_id, name, slug, description,
         duration_minutes, booking_form_type, booking_mode,
         auto_confirm, max_advance_booking_days, min_notice_hours,
         buffer_before_minutes, buffer_after_minutes,
         booking_confirmation_message, public_booking_enabled,
         status, metadata, colour
       ) VALUES (
         $1, $2, $3, $4, $5,
         COALESCE($6, 60), $7, $8,
         COALESCE($9, false), $10, COALESCE($11, 0),
         COALESCE($12, 0), COALESCE($13, 0),
         $14, COALESCE($15, true),
         COALESCE($16, 'active'), COALESCE($17::jsonb, '{}'::jsonb), $18
       ) RETURNING *`,
      [
        req.auth.tenant_id,
        data.resource_id,
        data.name,
        data.slug,
        data.description || null,
        data.duration_minutes,
        formType,
        bookingMode,
        data.auto_confirm ?? false,
        data.max_advance_booking_days || null,
        data.min_notice_hours,
        data.buffer_before_minutes,
        data.buffer_after_minutes,
        data.booking_confirmation_message || null,
        data.public_booking_enabled ?? true,
        data.status || 'active',
        JSON.stringify(data.metadata || {}),
        colour
      ]
    );

    await writeAudit(client, req.auth.tenant_id, req.auth.sub, 'event_type', result.rows[0].id, 'created', data);
    return result.rows[0];
  });

  res.status(201).json(created);
}));

// PATCH /api/event-types/:id
router.patch('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const updated = await withTenantContext(req.auth.tenant_id, async (client) => {
    const currentResult = await client.query(
      `SELECT * FROM public.event_types
        WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.auth.tenant_id]
    );
    const current = currentResult.rows[0];
    if (!current) throw new AppError(404, 'Event type not found.');

    const data = { ...current, ...(req.body || {}) };

    const formType = VALID_FORM_TYPES.includes(data.booking_form_type)
      ? data.booking_form_type
      : 'classic';

    const bookingMode = VALID_BOOKING_MODES.includes(data.booking_mode)
      ? data.booking_mode
      : 'free';

    // If slug is changing, check uniqueness
    if (data.slug !== current.slug) {
      const slugCheck = await client.query(
        `SELECT id FROM public.event_types
          WHERE slug = $1 AND tenant_id = $2 AND id != $3`,
        [data.slug, req.auth.tenant_id, req.params.id]
      );
      if (slugCheck.rowCount) throw new AppError(409, 'An event type with this slug already exists.');
    }

    const colour = HEX_COLOUR_RE.test(data.colour) ? data.colour : (current.colour || '#1e2a78');

    const result = await client.query(
      `UPDATE public.event_types
          SET name                         = $2,
              slug                         = $3,
              description                  = $4,
              duration_minutes             = $5,
              booking_form_type            = $6,
              booking_mode                 = $7,
              auto_confirm                 = $8,
              max_advance_booking_days     = $9,
              min_notice_hours             = $10,
              buffer_before_minutes        = $11,
              buffer_after_minutes         = $12,
              booking_confirmation_message = $13,
              public_booking_enabled       = $14,
              status                       = $15,
              metadata                     = $16::jsonb,
              colour                       = $17
        WHERE id = $1 AND tenant_id = $18
      RETURNING *`,
      [
        req.params.id,
        data.name,
        data.slug,
        data.description || null,
        data.duration_minutes,
        formType,
        bookingMode,
        data.auto_confirm ?? false,
        data.max_advance_booking_days || null,
        data.min_notice_hours,
        data.buffer_before_minutes,
        data.buffer_after_minutes,
        data.booking_confirmation_message || null,
        data.public_booking_enabled ?? true,
        data.status || 'active',
        JSON.stringify(data.metadata || {}),
        colour,
        req.auth.tenant_id
      ]
    );

    await writeAudit(client, req.auth.tenant_id, req.auth.sub, 'event_type', req.params.id, 'updated', req.body || {});
    return result.rows[0];
  });

  res.json(updated);
}));

// DELETE /api/event-types/:id
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const result = await withTenantContext(req.auth.tenant_id, async (client) => {
    const eventTypeResult = await client.query(
      `SELECT id FROM public.event_types
        WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.auth.tenant_id]
    );
    if (!eventTypeResult.rowCount) throw new AppError(404, 'Event type not found.');

    // Check for any bookings against this event type
    const bookingsResult = await client.query(
      `SELECT COUNT(*)::int AS total FROM public.bookings
        WHERE event_type_id = $1 AND tenant_id = $2`,
      [req.params.id, req.auth.tenant_id]
    );
    const hasBookings = bookingsResult.rows[0].total > 0;

    if (hasBookings) {
      // Soft delete — set status to inactive
      await client.query(
        `UPDATE public.event_types
            SET status = 'inactive', updated_at = now()
          WHERE id = $1 AND tenant_id = $2`,
        [req.params.id, req.auth.tenant_id]
      );
      await writeAudit(client, req.auth.tenant_id, req.auth.sub, 'event_type', req.params.id, 'deactivated', {
        reason: 'Deleted with existing bookings — event type deactivated.'
      });
      return { deactivated: true };
    } else {
      await client.query(
        `DELETE FROM public.event_types
          WHERE id = $1 AND tenant_id = $2`,
        [req.params.id, req.auth.tenant_id]
      );
      await writeAudit(client, req.auth.tenant_id, req.auth.sub, 'event_type', req.params.id, 'deleted');
      return { deactivated: false };
    }
  });

  res.status(200).json(result);
}));

export default router;
