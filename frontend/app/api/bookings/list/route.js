import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { config } from '../../../../lib/config';
import { getAuthToken } from '../../../../lib/auth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const params = searchParams.toString();

  const headerStore = headers();
  const forwardedHost = headerStore.get('x-forwarded-host');
  const hostHeader = forwardedHost || headerStore.get('host') || config.defaultTenantHost;
  const tenantHost = hostHeader.split(':')[0];
  const subdomain = tenantHost.split('.')[0];
  const token = await getAuthToken();

  if (!token) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const response = await fetch(
      `${config.apiBaseUrl}/api/bookings${params ? `?${params}` : ''}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-subdomain': subdomain,
        },
        cache: 'no-store',
      }
    );
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: 'API unavailable.' }, { status: 503 });
  }
}
