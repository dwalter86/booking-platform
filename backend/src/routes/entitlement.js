import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { withTenantContext } from '../lib/db.js';
import { getTenantEntitlements } from '../services/entitlements-service.js';

const router = express.Router();

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const tenantId = req.auth.tenant_id;

    const result = await withTenantContext(tenantId, async (client) => {
      // Resolve plan entitlements (limits + features)
      const entitlements = await getTenantEntitlements(client, tenantId);

      // Live absolute counts — run inside tenant context so RLS is set
      const [rcResult, aucResult, cccResult] = await Promise.all([
        client.query(
          `SELECT COUNT(*)::int AS total FROM public.resources
           WHERE is_active = true`
        ),
        client.query(
          `SELECT COUNT(*)::int AS total FROM public.users
           WHERE is_active = true AND is_super_admin = false`
        ),
        client.query(
          `SELECT COUNT(*)::int AS total FROM public.calendar_connections
           WHERE status = 'active'`
        ),
      ]);

      // Monthly booking usage from counters
      const now         = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const bpmResult   = await client.query(
        `SELECT usage_value FROM public.tenant_usage_counters
         WHERE tenant_id = $1 AND metric_key = 'bookings_per_month'
           AND period_start = $2 AND period_end = $3`,
        [tenantId, periodStart, periodEnd]
      );

      const rc  = rcResult.rows[0].total;
      const auc = aucResult.rows[0].total;
      const ccc = cccResult.rows[0].total;
      const bpm = bpmResult.rows.length > 0 ? parseInt(bpmResult.rows[0].usage_value, 10) : 0;

      function usageStat(current, limitValue) {
        const limit = limitValue != null ? Number(limitValue) : null;
        return {
          current,
          limit,
          remaining: limit != null ? Math.max(0, limit - current) : null,
        };
      }

      const limits = entitlements.limits;

      return {
        subscription:       entitlements.subscription,
        planCode:           entitlements.subscription?.plan_code  || null,
        planName:           entitlements.subscription?.plan_name  || null,
        subscriptionStatus: entitlements.subscription?.status     || null,
        periodEnd:          entitlements.subscription?.current_period_end || null,
        features:           entitlements.features,
        limits: {
          resources_count:            limits['resources_count:absolute']            ?? null,
          admin_users_count:          limits['admin_users_count:absolute']          ?? null,
          calendar_connections_count: limits['calendar_connections_count:absolute'] ?? null,
          bookings_per_month:         limits['bookings_per_month:monthly']          ?? null,
          api_calls_per_month:        limits['api_calls_per_month:monthly']         ?? null,
        },
        usage: {
          resources_count:            usageStat(rc,  limits['resources_count:absolute']),
          admin_users_count:          usageStat(auc, limits['admin_users_count:absolute']),
          calendar_connections_count: usageStat(ccc, limits['calendar_connections_count:absolute']),
          bookings_per_month:         usageStat(bpm, limits['bookings_per_month:monthly']),
        },
      };
    });

    return res.json(result);
  } catch (err) {
    console.error('[GET /api/entitlement]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
