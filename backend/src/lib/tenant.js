import { query } from './db.js';

export function extractTenantSubdomain(hostname, baseDomain = '') {
  if (!hostname) return null;
  const host = String(hostname).split(':')[0].toLowerCase();
  if (baseDomain && host.endsWith(`.${baseDomain}`)) {
    const sub = host.slice(0, -(baseDomain.length + 1));
    return sub || null;
  }
  const parts = host.split('.');
  if (parts.length >= 3) return parts[0];
  return null;
}

export async function getTenantBySubdomain(subdomain) {
  if (!subdomain) return null;
  const { rows } = await query(
    `SELECT
       id, name, display_name, slug, subdomain, status, timezone,
       logo_url, brand_colour, public_booking_enabled,
       booking_confirmation_message, contact_email,
       metadata, created_at, updated_at
     FROM public.tenants
     WHERE subdomain = $1
     LIMIT 1`,
    [subdomain]
  );
  return rows[0] || null;
}

export async function resolveTenantEntitlement(tenantId) {
  const GRACE_PERIOD_DAYS = 14;
  
  const { rows } = await query(
    `SELECT
       t.id                          AS tenant_id,
       t.status                      AS tenant_status,

       s.id                          AS subscription_id,
       s.status                      AS subscription_status,
       s.plan_id,
       s.current_period_end,
       s.cancel_at_period_end,
       s.overrides,

       p.code                        AS plan_code,
       p.name                        AS plan_name,

       COALESCE(
         (SELECT jsonb_object_agg(pl.metric_key, pl.limit_value)
          FROM public.plan_limits pl
          WHERE pl.plan_id = s.plan_id),
         '{}'::jsonb
       ) AS plan_limits,

       COALESCE(
         (SELECT jsonb_object_agg(pf.feature_key, jsonb_build_object(
           'is_enabled', pf.is_enabled,
           'config',     pf.config
         ))
          FROM public.plan_features pf
          WHERE pf.plan_id = s.plan_id),
         '{}'::jsonb
       ) AS plan_features

     FROM public.tenants t
     LEFT JOIN public.tenant_subscriptions s
       ON s.tenant_id = t.id
       AND s.status IN ('trial', 'grace', 'active', 'past_due')
     LEFT JOIN public.plans p ON p.id = s.plan_id
     WHERE t.id = $1
     ORDER BY s.created_at DESC
     LIMIT 1`,
    [tenantId]
  );

  const blocked = (reason) => ({
    state: 'blocked',
    planCode: null, planName: null,
    subscriptionId: null, subscriptionStatus: null,
    periodEnd: null, cancelAtPeriodEnd: null,
    limits: {}, features: {},
    graceDaysRemaining: null,
    blockedReason: reason,
  });

  if (rows.length === 0) return blocked('Tenant not found');

  const row = rows[0];

  if (row.tenant_status !== 'active') return blocked(`Tenant is ${row.tenant_status}`);
  if (!row.subscription_id)           return blocked('No active subscription');

  const overrides      = row.overrides || {};
  const mergedLimits   = { ...row.plan_limits,   ...(overrides.limits   || {}) };
  const mergedFeatures = { ...row.plan_features, ...(overrides.features || {}) };

  const base = {
    planCode:           row.plan_code,
    planName:           row.plan_name,
    subscriptionId:     row.subscription_id,
    subscriptionStatus: row.subscription_status,
    periodEnd:          row.current_period_end,
    cancelAtPeriodEnd:  row.cancel_at_period_end,
    limits:             mergedLimits,
    features:           mergedFeatures,
    graceDaysRemaining: null,
    blockedReason:      null,
  };

  if (row.subscription_status === 'active' || row.subscription_status === 'past_due') {
    return { state: 'active', ...base };
  }

  if (row.subscription_status === 'trial') {
    const now       = new Date();
    const periodEnd = new Date(row.current_period_end);

    if (now <= periodEnd) {
      return { state: 'trial_active', ...base };
    }

    const graceEnd           = new Date(periodEnd);
    graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS);
    const graceDaysRemaining = Math.ceil((graceEnd - now) / (1000 * 60 * 60 * 24));

    if (now <= graceEnd) {
      return { state: 'trial_grace', ...base, graceDaysRemaining };
    }

    return blocked('Trial expired');
  }
  
  if (row.subscription_status === 'grace') {
    const now      = new Date();
    const graceEnd = new Date(row.current_period_end);
    graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS);
    const graceDaysRemaining = Math.ceil((graceEnd - now) / (1000 * 60 * 60 * 24));

    if (now <= graceEnd) {
      return { state: 'trial_grace', ...base, graceDaysRemaining };
    }

    return blocked('Trial expired');
  }

  return blocked(`Unhandled subscription status: ${row.subscription_status}`);
}
