import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { config } from '../../../../lib/config';

export async function POST(request) {
  const form = await request.formData();

  const resourceId = String(form.get('resource_id') || '').trim();
  const customerName = String(form.get('customer_name') || '').trim();
  const customerEmail = String(form.get('customer_email') || '').trim();
  const customerPhone = String(form.get('customer_phone') || '').trim();
  const notes = String(form.get('notes') || '').trim();
  const partySize = String(form.get('party_size') || '1').trim();

  const startLocal = String(form.get('start_at_local') || '').trim();
  const endLocal = String(form.get('end_at_local') || '').trim();

  const headerStore = headers();
  const forwardedHost = headerStore.get('x-forwarded-host');
  const hostHeader = forwardedHost || headerStore.get('host') || config.defaultTenantHost;
  const tenantHost = hostHeader.split(':')[0];
  const tenantSubdomain = tenantHost.split('.')[0];
  const forwardedProto = headerStore.get('x-forwarded-proto') || 'http';
  const baseUrl = `${forwardedProto}://${tenantHost}`;

  let startAt = '';
  let endAt = '';

  try {
    if (startLocal) startAt = new Date(startLocal).toISOString();
    if (endLocal) endAt = new Date(endLocal).toISOString();
  } catch {
    return NextResponse.redirect(
      new URL('/book?error=Invalid date/time supplied.', baseUrl),
      302
    );
  }

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/public-bookings/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-subdomain': tenantSubdomain
      },
      body: JSON.stringify({
        resource_id: resourceId,
        start_at: startAt,
        end_at: endAt,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        notes,
        party_size: Number(partySize || 1)
      }),
      cache: 'no-store'
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.redirect(
        new URL(`/book?error=${encodeURIComponent(data?.error || 'Booking request failed.')}`, baseUrl),
        302
      );
    }

    return NextResponse.redirect(
      new URL('/book?success=Provisional booking request submitted.', baseUrl),
      302
    );
  } catch {
    return NextResponse.redirect(
      new URL('/book?error=Booking API unavailable.', baseUrl),
      302
    );
  }
}
