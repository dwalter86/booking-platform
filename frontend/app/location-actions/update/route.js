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

  const payload = {
    name: String(form.get('name') || '').trim(),
    address_line_1: String(form.get('address_line_1') || '').trim() || null,
    address_line_2: String(form.get('address_line_2') || '').trim() || null,
    city: String(form.get('city') || '').trim() || null,
    postcode: String(form.get('postcode') || '').trim() || null,
    country: String(form.get('country') || 'GB').trim(),
    is_active: form.get('is_active') === 'true',
  };

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/locations/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(tenantSubdomain ? { 'x-tenant-subdomain': tenantSubdomain } : {}),
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const message = encodeURIComponent(data?.error || 'Unable to update location');
      return NextResponse.redirect(new URL(`/locations?location_id=${id}&error=${message}`, baseUrl), 302);
    }
  } catch {
    return NextResponse.redirect(new URL(`/locations?location_id=${id}&error=API%20unavailable`, baseUrl), 302);
  }

  return NextResponse.redirect(new URL(`/locations?location_id=${id}&success=Location%20updated`, baseUrl), 302);
}
