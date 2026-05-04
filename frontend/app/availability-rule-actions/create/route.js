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

  const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
  const rawDays = form.getAll('day_of_week');
  let selectedDays;
  if (rawDays.includes('all')) {
    selectedDays = ALL_DAYS;
  } else {
    selectedDays = [...new Set(
      rawDays.map((v) => parseInt(v, 10)).filter((n) => !isNaN(n) && n >= 0 && n <= 6)
    )];
  }

  if (selectedDays.length === 0) {
    const message = encodeURIComponent('Please select at least one day of the week');
    return NextResponse.redirect(new URL(`${redirectBase}${sep(redirectBase)}error=${message}`, baseUrl), 302);
  }

  const sharedFields = {
    resource_id,
    start_time:            String(form.get('start_time') || '').trim(),
    end_time:              String(form.get('end_time') || '').trim(),
    slot_duration_minutes: form.get('slot_duration_minutes') ? parseInt(form.get('slot_duration_minutes'), 10) : null,
    slot_interval_minutes: form.get('slot_interval_minutes') ? parseInt(form.get('slot_interval_minutes'), 10) : null,
    is_open:               form.get('is_open') === 'on',
  };

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...(tenantSubdomain ? { 'x-tenant-subdomain': tenantSubdomain } : {}),
  };

  const failures = [];
  for (const day of selectedDays) {
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/availability-rules`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ ...sharedFields, day_of_week: day }),
        cache: 'no-store',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        failures.push(data?.error || `Day ${day} failed`);
      }
    } catch {
      failures.push(`Day ${day}: API unavailable`);
    }
  }

  if (failures.length > 0 && failures.length === selectedDays.length) {
    const message = encodeURIComponent(failures[0] || 'Unable to create availability rules');
    return NextResponse.redirect(new URL(`${redirectBase}${sep(redirectBase)}error=${message}`, baseUrl), 302);
  }
  if (failures.length > 0) {
    const created = selectedDays.length - failures.length;
    const message = encodeURIComponent(`${created} rule(s) created. Failed: ${failures.join('; ')}`);
    return NextResponse.redirect(new URL(`${redirectBase}${sep(redirectBase)}success=${message}`, baseUrl), 302);
  }

  const count = selectedDays.length;
  const message = count === 1 ? 'Rule%20created' : encodeURIComponent(`${count} rules created`);
  return NextResponse.redirect(new URL(`${redirectBase}${sep(redirectBase)}success=${message}`, baseUrl), 302);
}
