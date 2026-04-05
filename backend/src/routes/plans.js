import { Router } from 'express';
import { asyncHandler } from '../lib/errors.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { withTenantContext, withClient } from '../lib/db.js';
import { getTenantEntitlements } from '../services/entitlements-service.js';

const router = Router();

router.get('/catalogue', asyncHandler(async (_req, res) => {
  const payload = await withClient(async (client) => {
    const [plans, limits, features] = await Promise.all([
      client.query(`SELECT * FROM public.plans WHERE is_active = true ORDER BY sort_order, name`),
      client.query(`SELECT * FROM public.plan_limits ORDER BY metric_key, period`),
      client.query(`SELECT * FROM public.plan_features ORDER BY feature_key`)
    ]);
    return { plans: plans.rows, limits: limits.rows, features: features.rows };
  });
  res.json(payload);
}));

router.get('/entitlements', requireAuth, asyncHandler(async (req, res) => {
  const entitlements = await withTenantContext(req.auth.tenant_id, async (client) => {
    return getTenantEntitlements(client, req.auth.tenant_id);
  });
  res.json(entitlements);
}));

router.get('/subscription', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const subscription = await withTenantContext(req.auth.tenant_id, async (client) => {
    const result = await client.query(
      `SELECT ts.*, p.code AS plan_code, p.name AS plan_name
         FROM public.tenant_subscriptions ts
         JOIN public.plans p ON p.id = ts.plan_id
        WHERE ts.tenant_id = $1
        ORDER BY ts.created_at DESC
        LIMIT 1`,
      [req.auth.tenant_id]
    );
    return result.rows[0] || null;
  });
  res.json(subscription);
}));

export default router;
