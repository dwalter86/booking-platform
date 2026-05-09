import express from 'express';
const { Router } = express;
const router = Router();
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { withTenantContext } from '../lib/db.js';

import { asyncHandler, AppError } from '../lib/errors.js';

// GET /api/locations
router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const rows = await withTenantContext(req.auth.tenant_id, async (client) => {
    const result = await client.query(
      `SELECT id, name, address_line_1, address_line_2, city, postcode, country, is_active, created_at
       FROM public.locations
       WHERE tenant_id = $1
       ORDER BY name ASC`,
      [req.auth.tenant_id]
    );
    return result.rows;
  });
  res.json(rows);
}));

// POST /api/locations
router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { name, address_line_1, address_line_2, city, postcode, country, is_active } = req.body;
  if (!name || name.trim() === '') throw new AppError(400, 'name is required.');

  const row = await withTenantContext(req.auth.tenant_id, async (client) => {
    const result = await client.query(
      `INSERT INTO public.locations (tenant_id, name, address_line_1, address_line_2, city, postcode, country, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.auth.tenant_id, name.trim(), address_line_1 || null, address_line_2 || null,
       city || null, postcode || null, country || 'GB', is_active !== false]
    );
    return result.rows[0];
  });
  res.status(201).json(row);
}));

// PATCH /api/locations/:id
router.patch('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { name, address_line_1, address_line_2, city, postcode, country, is_active } = req.body;

  const row = await withTenantContext(req.auth.tenant_id, async (client) => {
    const existing = await client.query(
      `SELECT id FROM public.locations WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.auth.tenant_id]
    );
    if (!existing.rows[0]) throw new AppError(404, 'Location not found.');

    const result = await client.query(
      `UPDATE public.locations
       SET name = COALESCE($1, name),
           address_line_1 = $2,
           address_line_2 = $3,
           city = $4,
           postcode = $5,
           country = COALESCE($6, country),
           is_active = COALESCE($7, is_active)
       WHERE id = $8 AND tenant_id = $9
       RETURNING *`,
      [name ? name.trim() : null, address_line_1 !== undefined ? address_line_1 : null,
       address_line_2 !== undefined ? address_line_2 : null,
       city !== undefined ? city : null, postcode !== undefined ? postcode : null,
       country || null, is_active !== undefined ? is_active : null,
       req.params.id, req.auth.tenant_id]
    );
    return result.rows[0];
  });
  res.json(row);
}));

// DELETE /api/locations/:id
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  await withTenantContext(req.auth.tenant_id, async (client) => {
    const existing = await client.query(
      `SELECT id FROM public.locations WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.auth.tenant_id]
    );
    if (!existing.rows[0]) throw new AppError(404, 'Location not found.');

    const inUse = await client.query(
      `SELECT 1 FROM public.resource_locations WHERE location_id = $1 LIMIT 1`,
      [req.params.id]
    );
    if (inUse.rows[0]) throw new AppError(409, 'This location is assigned to one or more resources. Remove it from all resources before deleting.');

    await client.query(
      `DELETE FROM public.locations WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.auth.tenant_id]
    );
  });
  res.json({ deleted: true });
}));

export default router;
