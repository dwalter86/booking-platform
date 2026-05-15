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

  const bookingId = String(form.get('booking_id') || '').trim();
  if (!bookingId) return NextResponse.redirect(new URL('/bookings?error=Booking%20ID%20is%20required', baseUrl), 302);

  const returnParams = String(form.get('return_params') || '').trim();
  const editBase = returnParams
    ? `/bookings?${returnParams}&booking_id=${bookingId}&edit=1`
    : `/bookings?booking_id=${bookingId}&edit=1`;
  const successBase = returnParams
    ? `/bookings?${returnParams}&booking_id=${bookingId}`
    : `/bookings?booking_id=${bookingId}`;

  const startAt = String(form.get('start_at') || '').trim();
  const endAt = String(form.get('end_at') || '').trim();

  const payload = {};
  const fields = [
    'customer_name', 'customer_email', 'customer_phone', 'party_size',
    'notes', 'event_type_id', 'resource_id', 'meeting_type', 'public_reference',
  ];
  for (const f of fields) {
    if (form.has(f)) {
      const v = String(form.get(f) || '').trim();
      // Empty string for nullable fields means "clear it" -> send null
      // For customer_name (required), empty string flows through and backend rejects it
      if (v === '' && f !== 'customer_name') {
        payload[f] = null;
      } else {
        payload[f] = v;
      }
    }
  }
  if (startAt) payload.start_at = startAt;
  if (endAt)   payload.end_at   = endAt;

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(tenantSubdomain ? { 'x-tenant-subdomain': tenantSubdomain } : {}),
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg = encodeURIComponent(data?.error || 'Unable to update booking');
      return NextResponse.redirect(new URL(`${editBase}&error=${msg}`, baseUrl), 302);
    }
  } catch {
    return NextResponse.redirect(new URL(`${editBase}&error=API%20unavailable`, baseUrl), 302);
  }

  return NextResponse.redirect(new URL(`${successBase}&success=Booking%20updated`, baseUrl), 302);
}
