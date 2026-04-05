import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { config } from '../../../../lib/config';

export async function POST(request) {
  const form = await request.formData();
  const email = String(form.get('email') || '').trim();
  const password = String(form.get('password') || '');

  const headerStore = headers();
  const forwardedHost = headerStore.get('x-forwarded-host');
  const hostHeader = forwardedHost || headerStore.get('host') || config.defaultTenantHost;
  const tenantHost = hostHeader.split(':')[0];
  const tenantSubdomain = tenantHost.split('.')[0];
  const forwardedProto = headerStore.get('x-forwarded-proto') || 'http';
  const baseUrl = `${forwardedProto}://${tenantHost}`;

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-subdomain': tenantSubdomain
      },
      body: JSON.stringify({ email, password }),
      cache: 'no-store'
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data?.token) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(data?.error || 'Login failed')}`, baseUrl),
        302
      );
    }

    const redirectResponse = NextResponse.redirect(new URL('/dashboard', baseUrl), 302);

    redirectResponse.cookies.set('booking_admin_token', data.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/'
    });

    return redirectResponse;
  } catch {
    return NextResponse.redirect(
      new URL('/login?error=API unavailable', baseUrl),
      302
    );
  }
}
