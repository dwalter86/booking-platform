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
  return {
    baseUrl: `${forwardedProto}://${tenantHost}`,
    tenantSubdomain
  };
}

export async function POST(request) {
  const form = await request.formData();
  const token = cookies().get('booking_admin_token')?.value || null;
  const { baseUrl, tenantSubdomain } = getContext();
  const id = String(form.get('id') || '').trim();

  if (!token) {
    return NextResponse.redirect(new URL('/login', baseUrl), 302);
  }

  if (!id) {
    return NextResponse.redirect(new URL('/unavailability-blocks?error=Missing%20unavailability%20block%20id', baseUrl), 302);
  }

  const payload = {
    resource_id: String(form.get('resource_id') || '').trim(),
    start_at: String(form.get('start_at') || '').trim(),
    end_at: String(form.get('end_at') || '').trim(),
    reason: String(form.get('reason') || '').trim() || null
  };

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/unavailability-blocks/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(tenantSubdomain ? { 'x-tenant-subdomain': tenantSubdomain } : {})
      },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const message = encodeURIComponent(data?.error || 'Unable to update unavailability block');
      return NextResponse.redirect(new URL(`/unavailability-blocks?error=${message}`, baseUrl), 302);
    }
  } catch {
    return NextResponse.redirect(new URL('/unavailability-blocks?error=API%20unavailable', baseUrl), 302);
  }

  return NextResponse.redirect(new URL('/unavailability-blocks?success=Unavailability%20block%20updated', baseUrl), 302);
}
