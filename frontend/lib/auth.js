import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { config } from './config';

export async function getAuthToken() {
  return cookies().get('booking_admin_token')?.value || null;
}

export async function getTenantHost() {
  const headerStore = headers();
  const forwardedHost = headerStore.get('x-forwarded-host');
  const host = headerStore.get('host');
  return (forwardedHost || host || config.defaultTenantHost).split(':')[0];
}

export async function getTenantSubdomain() {
  const host = await getTenantHost();
  const parts = host.split('.').filter(Boolean);
  return parts.length >= 1 ? parts[0] : null;
}

export async function requireAuth() {
  const token = await getAuthToken();
  if (!token) redirect('/login');
  return token;
}

export async function apiFetch(path, options = {}) {
  const token = await getAuthToken();
  const tenantSubdomain = await getTenantSubdomain();
  const headersObject = {
    'Content-Type': 'application/json',
    ...(tenantSubdomain ? { 'x-tenant-subdomain': tenantSubdomain } : {}),
    ...(options.headers || {})
  };

  if (token) headersObject.Authorization = `Bearer ${token}`;

  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...options,
    headers: headersObject,
    cache: 'no-store'
  });

  if (response.status === 401) {
    redirect('/login');
  }

  return response;
}
