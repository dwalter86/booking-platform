import express from 'express';
const { Router } = express;
const router = Router();
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { withTenantContext } from '../lib/db.js';

import { asyncHandler, AppError } from '../lib/errors.js';

const VALID_TYPES = ['in_person', 'online', 'telephone'];
const VALID_PLATFORMS = ['teams', 'google_meet', 'zoom', 'other'];

// GET /api/resources/:id/meeting-types
router.get('/:id/meeting-types', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = await withTenantContext(req.auth.tenant_id, async (client) => {
    const resourceCheck = await client.query(
      `SELECT id FROM public.resources WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.auth.tenant_id]
    );
    if (!resourceCheck.rows[0]) throw new AppError(404, 'Resource not found.');

    const [typesResult, locationsResult] = await Promise.all([
      client.query(
        `SELECT id, meeting_type, is_active, online_platform, online_meeting_url
         FROM public.resource_meeting_types
         WHERE resource_id = $1 AND tenant_id = $2`,
        [req.params.id, req.auth.tenant_id]
      ),
      client.query(
        `SELECT location_id FROM public.resource_locations
         WHERE resource_id = $1 AND tenant_id = $2`,
        [req.params.id, req.auth.tenant_id]
      )
    ]);

    return {
      meeting_types: typesResult.rows,
      assigned_location_ids: locationsResult.rows.map(r => r.location_id)
    };
  });
  res.json(data);
}));

// PUT /api/resources/:id/meeting-types
router.put('/:id/meeting-types', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { meeting_types } = req.body;
  if (!Array.isArray(meeting_types)) throw new AppError(400, 'meeting_types must be an array.');

  for (const mt of meeting_types) {
    if (!VALID_TYPES.includes(mt.meeting_type)) throw new AppError(400, `Invalid meeting_type: ${mt.meeting_type}`);
    if (mt.online_platform && !VALID_PLATFORMS.includes(mt.online_platform)) throw new AppError(400, `Invalid online_platform: ${mt.online_platform}`);
  }

  const rows = await withTenantContext(req.auth.tenant_id, async (client) => {
    const resourceCheck = await client.query(
      `SELECT id FROM public.resources WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.auth.tenant_id]
    );
    if (!resourceCheck.rows[0]) throw new AppError(404, 'Resource not found.');

    await client.query(
      `DELETE FROM public.resource_meeting_types WHERE resource_id = $1 AND tenant_id = $2`,
      [req.params.id, req.auth.tenant_id]
    );

    if (meeting_types.length === 0) return [];

    const inserted = [];
    for (const mt of meeting_types) {
      const result = await client.query(
        `INSERT INTO public.resource_meeting_types
         (resource_id, tenant_id, meeting_type, is_active, online_platform, online_meeting_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [req.params.id, req.auth.tenant_id, mt.meeting_type,
         mt.is_active !== false, mt.online_platform || null, mt.online_meeting_url || null]
      );
      inserted.push(result.rows[0]);
    }
    return inserted;
  });
  res.json(rows);
}));

// PUT /api/resources/:id/locations
router.put('/:id/locations', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { location_ids } = req.body;
  if (!Array.isArray(location_ids)) throw new AppError(400, 'location_ids must be an array.');

  await withTenantContext(req.auth.tenant_id, async (client) => {
    const resourceCheck = await client.query(
      `SELECT id FROM public.resources WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.auth.tenant_id]
    );
    if (!resourceCheck.rows[0]) throw new AppError(404, 'Resource not found.');

    if (location_ids.length > 0) {
      const locCheck = await client.query(
        `SELECT id FROM public.locations WHERE id = ANY($1) AND tenant_id = $2`,
        [location_ids, req.auth.tenant_id]
      );
      if (locCheck.rows.length !== location_ids.length) throw new AppError(400, 'One or more locations not found.');
    }

    await client.query(
      `DELETE FROM public.resource_locations WHERE resource_id = $1 AND tenant_id = $2`,
      [req.params.id, req.auth.tenant_id]
    );

    for (const loc_id of location_ids) {
      await client.query(
        `INSERT INTO public.resource_locations (resource_id, location_id, tenant_id) VALUES ($1, $2, $3)`,
        [req.params.id, loc_id, req.auth.tenant_id]
      );
    }
  });
  res.json({ updated: true });
}));

export default router;
