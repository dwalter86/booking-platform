import express from 'express';
import { query } from '../lib/db.js';

const router = express.Router();

async function getAbsoluteCount(tenantId, metricKey) {
  const countQueries = {
    resources_count: `SELECT COUNT(*) FROM public.resources WHERE tenant_id = $1`,
    admin_users_count: `SELECT COUNT(*) FROM public.users WHERE tenant_id = $1 AND is_active = true AND is_super_admin = false`,
    calendar_connections_count: `SELECT COUNT(*) FROM public.calendar_connections WHERE tenant_id = $1 AND status = 'active'`,
  };
  const sql = countQueries[metricKey];
  if (!sql) return 0;
  const { rows } = await query(sql, [tenantId]);
  return parseInt(rows[0].count, 10);
}

async function getMonthlyUsage(tenantId, metricKey) {
  const now         = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const { rows }    = await query(
    `SELECT usage_value FROM public.tenant_usage_counters
     WHERE tenant_id = $1 AND metric_key = $2
       AND period_start = $3 AND period_end = $4`,
    [tenantId, metricKey, periodStart, periodEnd]
  );
  return rows.length > 0 ? parseInt(rows[0].usage_value, 10) : 0;
}

function usageStat(current, limitRaw) {
  const limit = limitRaw != null ? Number(limitRaw) : null;
  return {
    current,
    limit,
    remaining: limit != null ? Math.max(0, limit - current) : null,
  };
}

router.get('/', async (req, res) => {
  try {
    const { entitlement, tenant } = req;

    if (!entitlement) {
      return res.status(401).json({ error: 'Entitlement not resolved' });
    }

    let usage = null;

    if (entitlement.state !== 'blocked') {
      const [rc, auc, ccc, bpm] = await Promise.all([
        getAbsoluteCount(tenant.id, 'resources_count'),
        getAbsoluteCount(tenant.id, 'admin_users_count'),
        getAbsoluteCount(tenant.id, 'calendar_connections_count'),
        getMonthlyUsage(tenant.id,  'bookings_per_month'),
      ]);

      usage = {
        resources_count:            usageStat(rc,  entitlement.limits.resources_count),
        admin_users_count:          usageStat(auc, entitlement.limits.admin_users_count),
        calendar_connections_count: usageStat(ccc, entitlement.limits.calendar_connections_count),
        bookings_per_month:         usageStat(bpm, entitlement.limits.bookings_per_month),
      };
    }

    return res.json({
      state:              entitlement.state,
      planCode:           entitlement.planCode,
      planName:           entitlement.planName,
      subscriptionStatus: entitlement.subscriptionStatus,
      periodEnd:          entitlement.periodEnd,
      cancelAtPeriodEnd:  entitlement.cancelAtPeriodEnd,
      graceDaysRemaining: entitlement.graceDaysRemaining,
      features:           entitlement.features,
      limits:             entitlement.limits,
      usage,
    });
  } catch (err) {
    console.error('[GET /api/entitlement]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
