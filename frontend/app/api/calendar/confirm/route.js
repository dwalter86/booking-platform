import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { config } from '../../../../lib/config';

export async function POST(request) {
  const token = cookies().get('booking_admin_token')?.value || null;
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const headerStore = headers();
  const forwardedHost = headerStore.get('x-forwarded-host');
  const hostHeader = forwardedHost || headerStore.get('host') || config.defaultTenantHost;
  const tenantSubdomain = hostHeader.split(':')[0].split('.')[0] || null;

  const { booking_id } = await request.json().catch(() => ({}));
  if (!booking_id) return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });

  const response = await fetch(`${config.apiBaseUrl}/api/bookings/${booking_id}/confirm`, {
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
  return NextResponse.json(data, { status: response.status });
}
