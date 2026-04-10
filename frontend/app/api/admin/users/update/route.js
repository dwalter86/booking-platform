import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { config } from '../../../../../lib/config';

export async function POST(request) {
  const form = await request.formData();
  const userId = String(form.get('user_id') || '').trim();
  const fullName = String(form.get('full_name') || '').trim();
  const role = String(form.get('role') || 'admin').trim();
  const isActive = form.get('is_active') === 'true';

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
  if (!userId) {
    return NextResponse.redirect(new URL('/admin-users?error=User%20ID%20is%20required.', baseUrl), 302);
  }

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-tenant-subdomain': subdomain,
      },
      body: JSON.stringify({ full_name: fullName, role, is_active: isActive }),
      cache: 'no-store'
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.redirect(new URL(`/admin-users?error=${encodeURIComponent(data?.error || 'Unable to update user.')}`, baseUrl), 302);
    }

    return NextResponse.redirect(new URL('/admin-users?success=User%20updated.', baseUrl), 302);
  } catch {
    return NextResponse.redirect(new URL('/admin-users?error=API%20unavailable.', baseUrl), 302);
  }
}
