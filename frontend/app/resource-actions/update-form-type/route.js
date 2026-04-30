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

const ALLOWED = ['classic', 'minimal', 'split', 'cards'];

export async function POST(request) {
  const form = await request.formData();
  const token = cookies().get('booking_admin_token')?.value || null;
  const tenantSubdomain = getTenantSubdomain();

  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const id = String(form.get('id') || '').trim();
  const booking_form_type = String(form.get('booking_form_type') || '').trim();

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  if (!ALLOWED.includes(booking_form_type)) return NextResponse.json({ error: 'Invalid form type' }, { status: 400 });

  try {
    const res = await fetch(`${config.apiBaseUrl}/api/resources/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(tenantSubdomain ? { 'x-tenant-subdomain': tenantSubdomain } : {}),
      },
      body: JSON.stringify({ booking_form_type }),
      cache: 'no-store',
    });
    if (!res.ok) return NextResponse.json({ error: 'API error' }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'API unavailable' }, { status: 503 });
  }
}
