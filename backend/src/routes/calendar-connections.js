import { Router } from 'express';
import { asyncHandler, AppError } from '../lib/errors.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { withTenantContext } from '../lib/db.js';
import { getTenantEntitlements, checkAbsoluteLimit } from '../services/entitlements-service.js';
import { writeAudit } from '../services/audit-service.js';

const router = Router();

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const rows = await withTenantContext(req.auth.tenant_id, async (client) => {
    const result = await client.query(`SELECT * FROM public.calendar_connections ORDER BY created_at DESC`);
    return result.rows;
  });
  res.json(rows);
}));

router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { provider, external_calendar_id, display_name, status = 'active' } = req.body || {};
  if (!provider || !external_calendar_id) throw new AppError(400, 'provider and external_calendar_id are required.');
  const created = await withTenantContext(req.auth.tenant_id, async (client) => {
    const entitlements = await getTenantEntitlements(client, req.auth.tenant_id);
    const currentCountResult = await client.query(`SELECT COUNT(*)::int AS total FROM public.calendar_connections`);
    const limit = entitlements.limits['calendars:absolute'];
    if (!checkAbsoluteLimit(currentCountResult.rows[0].total, limit)) {
      throw new AppError(402, 'Calendar connection limit reached for this tenant plan.');
    }

    const result = await client.query(
      `INSERT INTO public.calendar_connections (tenant_id, provider, external_calendar_id, display_name, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.auth.tenant_id, provider, external_calendar_id, display_name || null, status]
    );
    await writeAudit(client, req.auth.tenant_id, req.auth.sub, 'calendar_connection', result.rows[0].id, 'created', req.body || {});
    return result.rows[0];
  });
  res.status(201).json(created);
}));

export default router;
