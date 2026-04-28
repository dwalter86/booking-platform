import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { config } from '../../../lib/config';

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function boolFromForm(value) {
  return value === 'on' || value === 'true' || value === '1';
}

function numberOrNull(value, fallback = null) {
  if (value === null || value === undefined || String(value).trim() === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

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

export async function POST(request) {
  const form = await request.formData();
  const token = cookies().get('booking_admin_token')?.value || null;
  const baseUrl = getBaseUrl();
  const tenantSubdomain = getTenantSubdomain();
  const id = String(form.get('id') || '').trim();

  if (!token) {
    return NextResponse.redirect(new URL('/login', baseUrl), 302);
  }

  if (!id) {
    return NextResponse.redirect(new URL('/resources?error=Missing%20resource%20id', baseUrl), 302);
  }

  const name = String(form.get('name') || '').trim();
  const slugInput = String(form.get('slug') || '').trim();
  const slug = slugify(slugInput || name);

  if (!name || !slug) {
    return NextResponse.redirect(new URL('/resources?error=Name%20and%20slug%20are%20required', baseUrl), 302);
  }

  const payload = {
    name,
    slug,
    description: String(form.get('description') || '').trim() || null,
    timezone: String(form.get('timezone') || 'Europe/London').trim() || 'Europe/London',
    is_active: boolFromForm(form.get('is_active')),
    capacity: numberOrNull(form.get('capacity'), 1) ?? 1,
    booking_form_type: String(form.get('booking_form_type') || 'classic').trim(),
    max_booking_duration_hours: numberOrNull(form.get('max_booking_duration_hours')),
    min_notice_hours: numberOrNull(form.get('min_notice_hours'), 0) ?? 0,
    max_advance_booking_days: numberOrNull(form.get('max_advance_booking_days')),
    buffer_before_minutes: numberOrNull(form.get('buffer_before_minutes'), 0) ?? 0,
    buffer_after_minutes: numberOrNull(form.get('buffer_after_minutes'), 0) ?? 0,
    metadata: {}
  };

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/resources/${id}`, {
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
      const message = encodeURIComponent(data?.error || 'Unable to update resource');
      return NextResponse.redirect(new URL(`/resources?error=${message}`, baseUrl), 302);
    }
  } catch {
    return NextResponse.redirect(new URL('/resources?error=API%20unavailable', baseUrl), 302);
  }

  const returnId = String(form.get('return_resource_id') || '').trim();
  const redirectPath = returnId
    ? `/resources?resource_id=${encodeURIComponent(returnId)}&success=Resource%20updated`
    : '/resources?success=Resource%20updated';
  return NextResponse.redirect(new URL(redirectPath, baseUrl), 302);
}
