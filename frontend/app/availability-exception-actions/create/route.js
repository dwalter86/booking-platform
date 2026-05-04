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

function sep(url) { return url.includes('?') ? '&' : '?'; }

export async function POST(request) {
  const form = await request.formData();
  const token = cookies().get('booking_admin_token')?.value || null;
  const { baseUrl, tenantSubdomain } = getContext();

  if (!token) return NextResponse.redirect(new URL('/login', baseUrl), 302);

  const resource_id = String(form.get('resource_id') || '').trim();
  const returnBase = String(form.get('return_base') || '').trim();
  const redirectBase = returnBase || `/availability-rules?resource_id=${resource_id}`;
  const is_closed = form.get('is_closed') === 'on';

  const payload = {
    resource_id,
    exception_date: String(form.get('exception_date') || '').trim(),
    is_closed,
    start_time: is_closed ? null : String(form.get('start_time') || '').trim() || null,
    end_time:   is_closed ? null : String(form.get('end_time') || '').trim() || null,
    note:       String(form.get('note') || '').trim() || null,
  };

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/availability-exceptions`, {
      method: 'POST',
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
      const message = encodeURIComponent(data?.error || 'Unable to create exception');
      return NextResponse.redirect(new URL(`${redirectBase}${sep(redirectBase)}error=${message}`, baseUrl), 302);
    }
  } catch {
    return NextResponse.redirect(new URL(`${redirectBase}${sep(redirectBase)}error=API%20unavailable`, baseUrl), 302);
  }

  return NextResponse.redirect(new URL(`${redirectBase}${sep(redirectBase)}success=Exception%20created`, baseUrl), 302);
}
