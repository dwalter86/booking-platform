import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { config } from '../../../lib/config';

function getBaseUrl() {
  const headerStore   = headers();
  const forwardedHost = headerStore.get('x-forwarded-host');
  const hostHeader    = forwardedHost || headerStore.get('host') || config.defaultTenantHost;
  const tenantHost    = hostHeader.split(':')[0];
  const forwardedProto = headerStore.get('x-forwarded-proto') || 'http';
  return `${forwardedProto}://${tenantHost}`;
}

function getTenantSubdomain() {
  const headerStore   = headers();
  const forwardedHost = headerStore.get('x-forwarded-host');
  const hostHeader    = forwardedHost || headerStore.get('host') || config.defaultTenantHost;
  const tenantHost    = hostHeader.split(':')[0];
  return tenantHost.split('.')[0] || null;
}

export async function POST(request) {
  const token     = cookies().get('booking_admin_token')?.value || null;
  const baseUrl   = getBaseUrl();
  const subdomain = getTenantSubdomain();

  if (!token) return NextResponse.redirect(new URL('/login', baseUrl), 302);

  // Forward the multipart form data as-is to the backend
  const formData = await request.formData();
  const file     = formData.get('logo');

  if (!file || typeof file === 'string') {
    return NextResponse.redirect(
      new URL('/administration?tab=settings&error=No+file+selected', baseUrl), 302
    );
  }

  // Rebuild FormData to forward to backend
  const backendForm = new FormData();
  backendForm.append('logo', file, file.name);

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/tenant/logo`, {
      method:  'POST',
      headers: {
        'Authorization':      `Bearer ${token}`,
        'x-tenant-subdomain': subdomain,
      },
      body:  backendForm,
      cache: 'no-store',
    });

    if (!response.ok) {
      const data    = await response.json().catch(() => ({}));
      const message = encodeURIComponent(data?.error || 'Upload failed');
      return NextResponse.redirect(
        new URL(`/administration?tab=settings&error=${message}`, baseUrl), 302
      );
    }
  } catch {
    return NextResponse.redirect(
      new URL('/administration?tab=settings&error=Upload+API+unavailable', baseUrl), 302
    );
  }

  return NextResponse.redirect(
    new URL('/administration?tab=settings&success=Logo+updated', baseUrl), 302
  );
}
