import { Router } from 'express';
import { asyncHandler, AppError } from '../lib/errors.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { withTenantContext } from '../lib/db.js';
import { writeAudit } from '../services/audit-service.js';

const router = Router();

// GET /api/availability-exceptions?resource_id=xxx&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { resource_id, from, to } = req.query;
  if (!resource_id) throw new AppError(400, 'resource_id query parameter is required.');

  const rows = await withTenantContext(req.auth.tenant_id, async (client) => {
    // from/to are optional — if omitted, return all exceptions for the resource
    const result = await client.query(
      `SELECT *
         FROM public.availability_exceptions
        WHERE resource_id = $1
          AND ($2::date IS NULL OR exception_date >= $2::date)
          AND ($3::date IS NULL OR exception_date <= $3::date)
        ORDER BY exception_date ASC, start_time ASC NULLS FIRST`,
      [resource_id, from || null, to || null]
    );
    return result.rows;
  });

  res.json(rows);
}));

// GET /api/availability-exceptions/:id
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const row = await withTenantContext(req.auth.tenant_id, async (client) => {
    const result = await client.query(
      `SELECT * FROM public.availability_exceptions WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.auth.tenant_id]
    );
    return result.rows[0] || null;
  });

  if (!row) throw new AppError(404, 'Availability exception not found.');
  res.json(row);
}));

// POST /api/availability-exceptions
router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = req.body || {};

  if (!data.resource_id) throw new AppError(400, 'resource_id is required.');
  if (!data.exception_date) throw new AppError(400, 'exception_date is required.');

  // If not closed, times are required
  if (!data.is_closed && (!data.start_time || !data.end_time)) {
    throw new AppError(400, 'start_time and end_time are required when is_closed is false.');
  }

  const created = await withTenantContext(req.auth.tenant_id, async (client) => {
    const resourceCheck = await client.query(
      `SELECT id FROM public.resources WHERE id = $1 AND tenant_id = $2`,
      [data.resource_id, req.auth.tenant_id]
    );
    if (!resourceCheck.rows[0]) throw new AppError(404, 'Resource not found.');

    const result = await client.query(
      `INSERT INTO public.availability_exceptions (
         tenant_id, resource_id, exception_date,
         start_time, end_time, is_closed, note
       ) VALUES (
         $1, $2, $3, $4, $5,
         COALESCE($6, false),
         $7
       ) RETURNING *`,
      [
        req.auth.tenant_id,
        data.resource_id,
        data.exception_date,
        data.is_closed ? null : data.start_time,
        data.is_closed ? null : data.end_time,
        data.is_closed || false,
        data.note || null,
      ]
    );

    await writeAudit(
      client, req.auth.tenant_id, req.auth.sub,
      'availability_exception', result.rows[0].id, 'created', data
    );

    return result.rows[0];
  });

  res.status(201).json(created);
}));

// PATCH /api/availability-exceptions/:id
router.patch('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const updated = await withTenantContext(req.auth.tenant_id, async (client) => {
    const currentResult = await client.query(
      `SELECT * FROM public.availability_exceptions WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.auth.tenant_id]
    );
    const current = currentResult.rows[0];
    if (!current) throw new AppError(404, 'Availability exception not found.');

    const data = { ...current, ...(req.body || {}) };

    if (!data.is_closed && (!data.start_time || !data.end_time)) {
      throw new AppError(400, 'start_time and end_time are required when is_closed is false.');
    }

    const result = await client.query(
      `UPDATE public.availability_exceptions
          SET exception_date = $2,
              start_time     = $3,
              end_time       = $4,
              is_closed      = $5,
              note           = $6
        WHERE id = $1
          AND tenant_id = $7
        RETURNING *`,
      [
        req.params.id,
        data.exception_date,
        data.is_closed ? null : data.start_time,
        data.is_closed ? null : data.end_time,
        data.is_closed,
        data.note || null,
        req.auth.tenant_id,
      ]
    );

    await writeAudit(
      client, req.auth.tenant_id, req.auth.sub,
      'availability_exception', req.params.id, 'updated', req.body || {}
    );

    return result.rows[0];
  });

  res.json(updated);
}));

// DELETE /api/availability-exceptions/:id
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  await withTenantContext(req.auth.tenant_id, async (client) => {
    const deleted = await client.query(
      `DELETE FROM public.availability_exceptions WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [req.params.id, req.auth.tenant_id]
    );
    if (!deleted.rowCount) throw new AppError(404, 'Availability exception not found.');

    await writeAudit(
      client, req.auth.tenant_id, req.auth.sub,
      'availability_exception', req.params.id, 'deleted'
    );
  });

  res.status(204).send();
}));

export default router;
