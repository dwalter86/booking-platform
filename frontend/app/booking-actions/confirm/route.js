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
  return hostHeader.split(':')[0].split('.')[0] || null;
}

export async function POST(request) {
  const token = cookies().get('booking_admin_token')?.value || null;
  const form = await request.formData();
  const bookingId = String(form.get('booking_id') || '').trim();
  const baseUrl = getBaseUrl();
  const tenantSubdomain = getTenantSubdomain();

  if (!token) return NextResponse.redirect(new URL('/login', baseUrl), 302);
  if (!bookingId) return NextResponse.redirect(new URL('/bookings?error=Booking%20ID%20is%20required', baseUrl), 302);

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/bookings/${bookingId}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(tenantSubdomain ? { 'x-tenant-subdomain': tenantSubdomain } : {})
      },
      body: JSON.stringify({}),
      cache: 'no-store'
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg = encodeURIComponent(data?.error || 'Unable to confirm booking');
      return NextResponse.redirect(new URL(`/bookings?error=${msg}`, baseUrl), 302);
    }
  } catch {
    return NextResponse.redirect(new URL('/bookings?error=API%20unavailable', baseUrl), 302);
  }

  return NextResponse.redirect(new URL('/bookings?success=Booking%20confirmed', baseUrl), 302);
}
