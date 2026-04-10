import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { config } from './config';

export async function getSuperAdminToken() {
  return cookies().get('superadmin_token')?.value || null;
}

export async function requireSuperAdmin() {
  const token = await getSuperAdminToken();
  if (!token) redirect('/superadmin/login');
  return token;
}

export async function superAdminFetch(path, options = {}) {
  const token = await getSuperAdminToken();

  const headersObject = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) headersObject.Authorization = `Bearer ${token}`;

  // Deliberately NO x-tenant-subdomain header — super-admin is cross-tenant
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...options,
    headers: headersObject,
    cache: 'no-store',
  });

  if (response.status === 401) redirect('/superadmin/login');
  if (response.status === 403) redirect('/superadmin/login');

  return response;
}
