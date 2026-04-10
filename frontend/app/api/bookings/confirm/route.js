import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { config } from '../../../../lib/config';

export async function POST(request) {
  const form = await request.formData();
  const bookingId = String(form.get('booking_id') || '').trim();
  const headerStore = headers();
  const forwardedHost = headerStore.get('x-forwarded-host');
  const hostHeader = forwardedHost || headerStore.get('host') || config.defaultTenantHost;
  const tenantHost = hostHeader.split(':')[0];
  const forwardedProto = headerStore.get('x-forwarded-proto') || 'http';
  const baseUrl = `${forwardedProto}://${tenantHost}`;
  const subdomain = tenantHost.split('.')[0];
  const token = cookies().get('booking_admin_token')?.value;

  if (!bookingId) {
    return NextResponse.redirect(new URL('/bookings?error=Booking%20ID%20is%20required.', baseUrl), 302);
  }
  if (!token) {
    return NextResponse.redirect(new URL('/login?error=Session%20expired', baseUrl), 302);
  }

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/bookings/${bookingId}/confirm`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-tenant-subdomain': subdomain,
      },
      cache: 'no-store'
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.redirect(new URL(`/bookings?error=${encodeURIComponent(data?.error || 'Unable to confirm booking.')}`, baseUrl), 302);
    }

    return NextResponse.redirect(new URL('/bookings?success=Booking%20confirmed.', baseUrl), 302);
  } catch {
    return NextResponse.redirect(new URL('/bookings?error=Booking%20API%20unavailable.', baseUrl), 302);
  }
}
