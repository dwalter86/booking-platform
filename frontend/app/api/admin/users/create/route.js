import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { config } from '../../../../../lib/config';

export async function POST(request) {
  const form = await request.formData();
  const email = String(form.get('email') || '').trim();
  const fullName = String(form.get('full_name') || '').trim();
  const password = String(form.get('password') || '');
  const role = String(form.get('role') || 'admin').trim();

  const headerStore = headers();
  const forwardedHost = headerStore.get('x-forwarded-host');
  const hostHeader = forwardedHost || headerStore.get('host') || config.defaultTenantHost;
  const tenantHost = hostHeader.split(':')[0];
  const forwardedProto = headerStore.get('x-forwarded-proto') || 'http';
  const baseUrl = `${forwardedProto}://${tenantHost}`;
  const subdomain = tenantHost.split('.')[0];
  const token = cookies().get('booking_admin_token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=Session%20expired', baseUrl), 302);
  }

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/admin/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-tenant-subdomain': subdomain,
      },
      body: JSON.stringify({ email, full_name: fullName, password, role }),
      cache: 'no-store'
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.redirect(new URL(`/admin-users?error=${encodeURIComponent(data?.error || 'Unable to create user.')}`, baseUrl), 302);
    }

    return NextResponse.redirect(new URL('/admin-users?success=User%20created.', baseUrl), 302);
  } catch {
    return NextResponse.redirect(new URL('/admin-users?error=API%20unavailable.', baseUrl), 302);
  }
}
