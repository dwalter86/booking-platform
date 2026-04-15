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
  const form      = await request.formData();
  const token     = cookies().get('booking_admin_token')?.value || null;
  const baseUrl   = getBaseUrl();
  const subdomain = getTenantSubdomain();

  if (!token) return NextResponse.redirect(new URL('/login', baseUrl), 302);

  const payload = {
    public_booking_enabled:       form.get('public_booking_enabled') === 'on',
    booking_confirmation_message: String(form.get('booking_confirmation_message') || '').trim() || undefined,
  };

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/tenant/profile`, {
      method:  'PATCH',
      headers: {
        'Content-Type':       'application/json',
        'Authorization':      `Bearer ${token}`,
        'x-tenant-subdomain': subdomain,
      },
      body:  JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!response.ok) {
      const data    = await response.json().catch(() => ({}));
      const message = encodeURIComponent(data?.error || 'Unable to update booking settings');
      return NextResponse.redirect(new URL(`/administration?tab=settings&error=${message}`, baseUrl), 302);
    }
  } catch {
    return NextResponse.redirect(new URL('/administration?tab=settings&error=API+unavailable', baseUrl), 302);
  }

  return NextResponse.redirect(new URL('/administration?tab=settings&success=Booking+settings+updated', baseUrl), 302);
}
