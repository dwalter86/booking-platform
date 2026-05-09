import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { config } from '../../../lib/config';

function getContext() {
  const headerStore = headers();
  const forwardedHost = headerStore.get('x-forwarded-host');
  const hostHeader = forwardedHost || headerStore.get('host') || config.defaultTenantHost;
  const tenantHost = hostHeader.split(':')[0];
  const tenantSubdomain = tenantHost.split('.')[0] || null;
  const forwardedProto = headerStore.get('x-forwarded-proto') || 'http';
  return { baseUrl: `${forwardedProto}://${tenantHost}`, tenantSubdomain };
}

export async function POST(request) {
  const form = await request.formData();
  const token = cookies().get('booking_admin_token')?.value || null;
  const { baseUrl, tenantSubdomain } = getContext();

  if (!token) return NextResponse.redirect(new URL('/login', baseUrl), 302);

  const id = String(form.get('location_id') || '').trim();
  if (!id) return NextResponse.redirect(new URL('/locations?error=Missing%20location%20ID', baseUrl), 302);

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/locations/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...(tenantSubdomain ? { 'x-tenant-subdomain': tenantSubdomain } : {}),
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const message = encodeURIComponent(data?.error || 'Unable to delete location');
      return NextResponse.redirect(new URL(`/locations?error=${message}`, baseUrl), 302);
    }
  } catch {
    return NextResponse.redirect(new URL('/locations?error=API%20unavailable', baseUrl), 302);
  }

  return NextResponse.redirect(new URL('/locations?success=Location%20deleted', baseUrl), 302);
}
