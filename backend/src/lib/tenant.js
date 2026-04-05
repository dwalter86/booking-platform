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
    `SELECT id, name, slug, subdomain, status, timezone
       FROM public.tenants
      WHERE subdomain = $1
      LIMIT 1`,
    [subdomain]
  );
  return rows[0] || null;
}
