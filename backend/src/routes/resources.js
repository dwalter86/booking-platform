import { Router } from 'express';
import { asyncHandler, AppError } from '../lib/errors.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { withTenantContext } from '../lib/db.js';
import { getTenantEntitlements, checkAbsoluteLimit } from '../services/entitlements-service.js';
import { writeAudit } from '../services/audit-service.js';

const router = Router();

const VALID_FORM_TYPES = ['classic', 'minimal', 'split', 'cards'];

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const rows = await withTenantContext(req.auth.tenant_id, async (client) => {
    const result = await client.query(
      `SELECT * FROM public.resources WHERE archived_at IS NULL ORDER BY created_at DESC`
    );
    return result.rows;
  });
  res.json(rows);
}));

router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = req.body || {};
  const formType = VALID_FORM_TYPES.includes(data.booking_form_type)
    ? data.booking_form_type
    : 'classic';

  const created = await withTenantContext(req.auth.tenant_id, async (client) => {
    const entitlements = await getTenantEntitlements(client, req.auth.tenant_id);
    const currentCountResult = await client.query(`SELECT COUNT(*)::int AS total FROM public.resources`);
    const limit = entitlements.limits['resources_count:absolute'];
    if (!checkAbsoluteLimit(currentCountResult.rows[0].total, limit)) {
      throw new AppError(402, 'Resource limit reached for your current plan. Upgrade to add more resources.');
    }

    const result = await client.query(
      `INSERT INTO public.resources (
         tenant_id, name, slug, description, timezone, is_active, capacity,
         booking_mode, max_booking_duration_hours, min_notice_hours,
         max_advance_booking_days, buffer_before_minutes, buffer_after_minutes,
         booking_form_type, metadata, auto_confirm
       ) VALUES (
         $1, $2, $3, $4, COALESCE($5, 'UTC'), COALESCE($6, true), COALESCE($7, 1),
         COALESCE($8, 'free'), $9, COALESCE($10, 0), $11, COALESCE($12, 0), COALESCE($13, 0),
         COALESCE($14, 'classic'), COALESCE($15::jsonb, '{}'::jsonb), COALESCE($16, false)
       ) RETURNING *`,
      [
        req.auth.tenant_id,
        data.name,
        data.slug,
        data.description || null,
        data.timezone || 'UTC',
        data.is_active,
        data.capacity,
        data.booking_mode,
        data.max_booking_duration_hours || null,
        data.min_notice_hours,
        data.max_advance_booking_days || null,
        data.buffer_before_minutes,
        data.buffer_after_minutes,
        formType,
        JSON.stringify(data.metadata || {}),
        data.auto_confirm ?? false
      ]
    );
    await writeAudit(client, req.auth.tenant_id, req.auth.sub, 'resource', result.rows[0].id, 'created', data);
    return result.rows[0];
  });
  res.status(201).json(created);
}));

router.patch('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const updated = await withTenantContext(req.auth.tenant_id, async (client) => {
    const currentResult = await client.query(
      `SELECT * FROM public.resources WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.auth.tenant_id]
    );
    const current = currentResult.rows[0];
    if (!current) throw new AppError(404, 'Resource not found.');
    const data = { ...current, ...(req.body || {}) };

    // If activating a resource, check the plan limit
    const isActivating = !current.is_active && data.is_active === true;
    if (isActivating) {
      const entitlements = await getTenantEntitlements(client, req.auth.tenant_id);
      const limit = entitlements.limits['resources_count:absolute'];
      const activeCountResult = await client.query(
        `SELECT COUNT(*)::int AS total FROM public.resources
         WHERE is_active = true AND id != $1`,
        [req.params.id]
      );
      if (!checkAbsoluteLimit(activeCountResult.rows[0].total, limit)) {
        throw new AppError(402, 'Active resource limit reached for your current plan. Deactivate another resource or upgrade to activate this one.');
      }
    }

    const formType = VALID_FORM_TYPES.includes(data.booking_form_type)
      ? data.booking_form_type
      : 'classic';

    const result = await client.query(
      `UPDATE public.resources
          SET name = $2,
              slug = $3,
              description = $4,
              timezone = $5,
              is_active = $6,
              capacity = $7,
              booking_mode = $8,
              max_booking_duration_hours = $9,
              min_notice_hours = $10,
              max_advance_booking_days = $11,
              buffer_before_minutes = $12,
              buffer_after_minutes = $13,
              booking_form_type = $14,
              metadata = $15::jsonb,
              auto_confirm = $16
        WHERE id = $1 AND tenant_id = $17
      RETURNING *`,
      [
        req.params.id,
        data.name,
        data.slug,
        data.description,
        data.timezone,
        data.is_active,
        data.capacity,
        data.booking_mode,
        data.max_booking_duration_hours,
        data.min_notice_hours,
        data.max_advance_booking_days,
        data.buffer_before_minutes,
        data.buffer_after_minutes,
        formType,
        JSON.stringify(data.metadata || {}),
        data.auto_confirm ?? false,
        req.auth.tenant_id,
      ]
    );
    await writeAudit(client, req.auth.tenant_id, req.auth.sub, 'resource', req.params.id, 'updated', req.body || {});
    return result.rows[0];
  });
  res.json(updated);
}));

router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const result = await withTenantContext(req.auth.tenant_id, async (client) => {
    // Check resource exists
    const resourceResult = await client.query(
      `SELECT id FROM public.resources WHERE id = $1 AND tenant_id = $2 AND archived_at IS NULL`,
      [req.params.id, req.auth.tenant_id]
    );
    if (!resourceResult.rowCount) throw new AppError(404, 'Resource not found.');

    // Check for any bookings
    const bookingsResult = await client.query(
      `SELECT COUNT(*)::int AS total FROM public.bookings WHERE resource_id = $1 AND tenant_id = $2`,
      [req.params.id, req.auth.tenant_id]
    );
    const hasBookings = bookingsResult.rows[0].total > 0;

    if (hasBookings) {
      // Cancel any provisional bookings
      await client.query(
        `UPDATE public.bookings
         SET status = 'cancelled', updated_at = now()
         WHERE resource_id = $1 AND tenant_id = $2 AND status = 'provisional'`,
        [req.params.id, req.auth.tenant_id]
      );

      // Archive the resource
      await client.query(
        `UPDATE public.resources
         SET archived_at = now(), is_active = false, updated_at = now()
         WHERE id = $1 AND tenant_id = $2`,
        [req.params.id, req.auth.tenant_id]
      );

      await writeAudit(client, req.auth.tenant_id, req.auth.sub, 'resource', req.params.id, 'archived', {
        reason: 'Deleted with existing bookings — resource archived, provisional bookings cancelled.'
      });

      return { archived: true };
    } else {
      // No bookings — hard delete
      await client.query(
        `DELETE FROM public.resources WHERE id = $1 AND tenant_id = $2`,
        [req.params.id, req.auth.tenant_id]
      );

      await writeAudit(client, req.auth.tenant_id, req.auth.sub, 'resource', req.params.id, 'deleted');

      return { archived: false };
    }
  });

  res.status(200).json(result);
}));

export default router;
