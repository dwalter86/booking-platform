import { Router } from 'express';
import { asyncHandler, AppError } from '../lib/errors.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { withTenantContext } from '../lib/db.js';
import { writeAudit } from '../services/audit-service.js';

const router = Router();

function normalizePayload(data = {}) {
  return {
    resource_id: data.resource_id || null,
    start_at: data.start_at || null,
    end_at: data.end_at || null,
    reason: data.reason === undefined || data.reason === null || String(data.reason).trim() === ''
      ? null
      : String(data.reason).trim()
  };
}

function validatePayload(data) {
  if (!data.resource_id || !data.start_at || !data.end_at) {
    throw new AppError(400, 'resource_id, start_at and end_at are required.');
  }

  const start = new Date(data.start_at);
  const end = new Date(data.end_at);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new AppError(400, 'start_at and end_at must be valid datetime values.');
  }

  if (end <= start) {
    throw new AppError(400, 'end_at must be after start_at.');
  }
}

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const rows = await withTenantContext(req.auth.tenant_id, async (client) => {
    const result = await client.query(
      `SELECT ub.*, r.name AS resource_name, r.slug AS resource_slug
         FROM public.unavailability_blocks ub
         JOIN public.resources r ON r.id = ub.resource_id
        ORDER BY ub.start_at ASC, ub.created_at ASC`
    );
    return result.rows;
  });

  res.json(rows);
}));

router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = normalizePayload(req.body || {});
  validatePayload(data);

  const created = await withTenantContext(req.auth.tenant_id, async (client) => {
    const result = await client.query(
      `INSERT INTO public.unavailability_blocks (
         tenant_id, resource_id, start_at, end_at, reason, created_by_user_id
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.auth.tenant_id, data.resource_id, data.start_at, data.end_at, data.reason, req.auth.sub]
    );

    await writeAudit(
      client,
      req.auth.tenant_id,
      req.auth.sub,
      'unavailability_block',
      result.rows[0].id,
      'created',
      data
    );

    return result.rows[0];
  });

  res.status(201).json(created);
}));

router.patch('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = normalizePayload(req.body || {});
  validatePayload(data);

  const updated = await withTenantContext(req.auth.tenant_id, async (client) => {
    const existing = await client.query(
      `SELECT id, created_by_user_id
         FROM public.unavailability_blocks
        WHERE id = $1`,
      [req.params.id]
    );

    if (!existing.rowCount) {
      throw new AppError(404, 'Unavailability block not found.');
    }

    const result = await client.query(
      `UPDATE public.unavailability_blocks
          SET resource_id = $2,
              start_at = $3,
              end_at = $4,
              reason = $5,
              created_by_user_id = COALESCE(created_by_user_id, $6),
              updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
      [req.params.id, data.resource_id, data.start_at, data.end_at, data.reason, req.auth.sub]
    );

    await writeAudit(
      client,
      req.auth.tenant_id,
      req.auth.sub,
      'unavailability_block',
      req.params.id,
      'updated',
      data
    );

    return result.rows[0];
  });

  res.json(updated);
}));

router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  await withTenantContext(req.auth.tenant_id, async (client) => {
    const result = await client.query(
      `DELETE FROM public.unavailability_blocks
        WHERE id = $1
        RETURNING id`,
      [req.params.id]
    );

    if (!result.rowCount) {
      throw new AppError(404, 'Unavailability block not found.');
    }

    await writeAudit(
      client,
      req.auth.tenant_id,
      req.auth.sub,
      'unavailability_block',
      req.params.id,
      'deleted'
    );
  });

  res.status(204).send();
}));

export default router;
