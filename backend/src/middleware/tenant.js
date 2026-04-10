import { config } from '../config.js';
import { getTenantBySubdomain, extractTenantSubdomain, resolveTenantEntitlement } from '../lib/tenant.js';

export async function resolveTenant(req, res, next) {
  try {
    // Super-admin routes bypass tenant resolution entirely
    if (req.path.startsWith('/api/superadmin') || req.path.includes('superadmin-login')) {
      return next();
    }

    // Super-admin users bypass tenant resolution
    if (req.user?.is_super_admin) {
      return next();
    }

    const explicit  = req.header('x-tenant-subdomain') || req.query.tenant || null;
    const host      = req.header('x-forwarded-host') || req.header('host') || '';
    const subdomain = explicit || extractTenantSubdomain(host, config.tenantBaseDomain);

    req.tenantSubdomain = subdomain;
    req.tenant          = subdomain ? await getTenantBySubdomain(subdomain) : null;

    // No tenant found for this subdomain
    // Exempt superadmin-login which has no tenant by design
    if (subdomain && !req.tenant && !req.path.includes('superadmin-login')) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Skip entitlement resolution if no tenant (health / root routes)
    if (!req.tenant) {
      return next();
    }

    // Resolve entitlement — subscription state, plan limits, features
    const entitlement = await resolveTenantEntitlement(req.tenant.id);
    req.entitlement   = entitlement;

    // Hard block — suspended, cancelled, or trial fully expired
    // Auth routes are exempt so users can always reach the login page
    const isAuthRoute = req.path.startsWith('/api/auth');
    if (entitlement.state === 'blocked' && !isAuthRoute) {
      return res.status(403).json({
        error:  'Account access restricted',
        reason: entitlement.blockedReason,
        state:  entitlement.state,
      });
    }

    // Trial grace — allow through, signal frontend to show banner
    if (entitlement.state === 'trial_grace') {
      res.setHeader('X-Trial-Grace', 'true');
      res.setHeader('X-Trial-Grace-Days-Remaining', String(entitlement.graceDaysRemaining));
    }

    return next();
  } catch (error) {
    next(error);
  }
}

export function requireFeature(featureKey) {
  return (req, res, next) => {
    const feature = req.entitlement?.features?.[featureKey];
    if (!feature?.is_enabled) {
      return res.status(403).json({
        error:   'Feature not available on your current plan',
        feature: featureKey,
      });
    }
    return next();
  };
}
