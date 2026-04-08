import { Router } from 'express';
import { asyncHandler, AppError } from '../lib/errors.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { withTenantContext } from '../lib/db.js';
import { writeAudit } from '../services/audit-service.js';

const router = Router();

// GET /api/availability-rules?resource_id=xxx
// Returns all rules for a given resource
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { resource_id } = req.query;
  if (!resource_id) throw new AppError(400, 'resource_id query parameter is required.');

  const rows = await withTenantContext(req.auth.tenant_id, async (client) => {
    const result = await client.query(
      `SELECT *
         FROM public.availability_rules
        WHERE resource_id = $1
        ORDER BY day_of_week ASC, start_time ASC`,
      [resource_id]
    );
    return result.rows;
  });

  res.json(rows);
}));

// GET /api/availability-rules/:id
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const row = await withTenantContext(req.auth.tenant_id, async (client) => {
    const result = await client.query(
      `SELECT * FROM public.availability_rules WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.auth.tenant_id]
    );
    return result.rows[0] || null;
  });

  if (!row) throw new AppError(404, 'Availability rule not found.');
  res.json(row);
}));

// POST /api/availability-rules
router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = req.body || {};

  // Validate required fields
  const required = ['resource_id', 'day_of_week', 'start_time', 'end_time'];
  for (const field of required) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      throw new AppError(400, `${field} is required.`);
    }
  }

  if (data.day_of_week < 0 || data.day_of_week > 6) {
    throw new AppError(400, 'day_of_week must be between 0 (Sunday) and 6 (Saturday).');
  }

  const created = await withTenantContext(req.auth.tenant_id, async (client) => {
    // Verify the resource belongs to this tenant
    const resourceCheck = await client.query(
      `SELECT id FROM public.resources WHERE id = $1 AND tenant_id = $2`,
      [data.resource_id, req.auth.tenant_id]
    );
    if (!resourceCheck.rows[0]) throw new AppError(404, 'Resource not found.');

    const result = await client.query(
      `INSERT INTO public.availability_rules (
         tenant_id, resource_id, day_of_week,
         start_time, end_time,
         slot_duration_minutes, slot_interval_minutes,
         is_open
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7,
         COALESCE($8, true)
       ) RETURNING *`,
      [
        req.auth.tenant_id,
        data.resource_id,
        data.day_of_week,
        data.start_time,
        data.end_time,
        data.slot_duration_minutes || null,
        data.slot_interval_minutes || null,
        data.is_open,
      ]
    );

    await writeAudit(
      client, req.auth.tenant_id, req.auth.sub,
      'availability_rule', result.rows[0].id, 'created', data
    );

    return result.rows[0];
  });

  res.status(201).json(created);
}));

// PATCH /api/availability-rules/:id
router.patch('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const updated = await withTenantContext(req.auth.tenant_id, async (client) => {
    const currentResult = await client.query(
      `SELECT * FROM public.availability_rules WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.auth.tenant_id]
    );
    const current = currentResult.rows[0];
    if (!current) throw new AppError(404, 'Availability rule not found.');

    // Merge current with incoming — only update what's provided
    const data = { ...current, ...(req.body || {}) };

    if (data.day_of_week < 0 || data.day_of_week > 6) {
      throw new AppError(400, 'day_of_week must be between 0 and 6.');
    }

    const result = await client.query(
      `UPDATE public.availability_rules
          SET day_of_week             = $2,
              start_time              = $3,
              end_time                = $4,
              slot_duration_minutes   = $5,
              slot_interval_minutes   = $6,
              is_open                 = $7
        WHERE id = $1
          AND tenant_id = $8
        RETURNING *`,
      [
        req.params.id,
        data.day_of_week,
        data.start_time,
        data.end_time,
        data.slot_duration_minutes || null,
        data.slot_interval_minutes || null,
        data.is_open,
        req.auth.tenant_id,
      ]
    );

    await writeAudit(
      client, req.auth.tenant_id, req.auth.sub,
      'availability_rule', req.params.id, 'updated', req.body || {}
    );

    return result.rows[0];
  });

  res.json(updated);
}));

// DELETE /api/availability-rules/:id
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  await withTenantContext(req.auth.tenant_id, async (client) => {
    const deleted = await client.query(
      `DELETE FROM public.availability_rules WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [req.params.id, req.auth.tenant_id]
    );
    if (!deleted.rowCount) throw new AppError(404, 'Availability rule not found.');

    await writeAudit(
      client, req.auth.tenant_id, req.auth.sub,
      'availability_rule', req.params.id, 'deleted'
    );
  });

  res.status(204).send();
}));

export default router;
