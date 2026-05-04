import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { config } from '../../../lib/config';

function getBaseUrl() {
  const headerStore = headers();
  const forwardedHost = headerStore.get('x-forwarded-host');
  const hostHeader = forwardedHost || headerStore.get('host') || config.defaultTenantHost;
  const tenantHost = hostHeader.split(':')[0];
  const forwardedProto = headerStore.get('x-forwarded-proto') || 'http';
  return `${forwardedProto}://${tenantHost}`;
}

function getTenantSubdomain() {
  const headerStore = headers();
  const forwardedHost = headerStore.get('x-forwarded-host');
  const hostHeader = forwardedHost || headerStore.get('host') || config.defaultTenantHost;
  const tenantHost = hostHeader.split(':')[0];
  return tenantHost.split('.')[0] || null;
}

export async function POST(request) {
  const form = await request.formData();
  const token = cookies().get('booking_admin_token')?.value || null;
  const baseUrl = getBaseUrl();
  const tenantSubdomain = getTenantSubdomain();
  const id = String(form.get('id') || '').trim();

  if (!token) {
    return NextResponse.redirect(new URL('/login', baseUrl), 302);
  }

  if (!id) {
    return NextResponse.redirect(new URL('/resources?error=Missing%20resource%20id', baseUrl), 302);
  }

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/resources/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...(tenantSubdomain ? { 'x-tenant-subdomain': tenantSubdomain } : {})
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const message = encodeURIComponent(data?.error || 'Unable to delete resource');
      return NextResponse.redirect(new URL(`/resources?error=${message}`, baseUrl), 302);
    }

    const data = await response.json().catch(() => ({}));
    if (data.archived) {
      return NextResponse.redirect(
        new URL('/resources?success=Resource%20archived.%20Existing%20bookings%20have%20been%20preserved%20and%20provisional%20bookings%20cancelled.', baseUrl),
        302
      );
    }
  } catch {
    return NextResponse.redirect(new URL('/resources?error=API%20unavailable', baseUrl), 302);
  }

  return NextResponse.redirect(new URL('/resources?success=Resource%20deleted', baseUrl), 302);
}
