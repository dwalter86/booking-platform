import { config } from '../config.js';
import { getTenantBySubdomain, extractTenantSubdomain } from '../lib/tenant.js';

export async function resolveTenant(req, _res, next) {
  try {
    const explicit = req.header('x-tenant-subdomain') || req.query.tenant || null;
    const host = req.header('x-forwarded-host') || req.header('host') || '';
    const subdomain = explicit || extractTenantSubdomain(host, config.tenantBaseDomain);
    req.tenantSubdomain = subdomain;
    req.tenant = subdomain ? await getTenantBySubdomain(subdomain) : null;
    next();
  } catch (error) {
    next(error);
  }
}
