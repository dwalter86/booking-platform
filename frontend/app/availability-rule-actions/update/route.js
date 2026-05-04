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

function sep(url) {
  return url.includes('?') ? '&' : '?';
}

export async function POST(request) {
  const form = await request.formData();
  const token = cookies().get('booking_admin_token')?.value || null;
  const { baseUrl, tenantSubdomain } = getContext();

  if (!token) return NextResponse.redirect(new URL('/login', baseUrl), 302);

  const id = String(form.get('id') || '').trim();
  const resource_id = String(form.get('resource_id') || '').trim();
  const returnBase = String(form.get('return_base') || '').trim();
  const redirectBase = returnBase || `/availability-rules?resource_id=${resource_id}`;

  const payload = {
    day_of_week:            parseInt(form.get('day_of_week') || '0', 10),
    start_time:             String(form.get('start_time') || '').trim(),
    end_time:               String(form.get('end_time') || '').trim(),
    slot_duration_minutes:  form.get('slot_duration_minutes') ? parseInt(form.get('slot_duration_minutes'), 10) : null,
    slot_interval_minutes:  form.get('slot_interval_minutes') ? parseInt(form.get('slot_interval_minutes'), 10) : null,
    is_open:                form.get('is_open') === 'on',
  };

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/availability-rules/${id}`, {
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
      const message = encodeURIComponent(data?.error || 'Unable to update availability rule');
      return NextResponse.redirect(new URL(`${redirectBase}${sep(redirectBase)}error=${message}`, baseUrl), 302);
    }
  } catch {
    return NextResponse.redirect(new URL(`${redirectBase}${sep(redirectBase)}error=API%20unavailable`, baseUrl), 302);
  }

  return NextResponse.redirect(new URL(`${redirectBase}${sep(redirectBase)}success=Rule%20updated`, baseUrl), 302);
}
