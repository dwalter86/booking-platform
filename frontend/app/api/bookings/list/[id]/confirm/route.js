import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { config } from '../../../../../../lib/config';
import { getAuthToken } from '../../../../../../lib/auth';

export async function POST(request, { params }) {
  const { id } = params;

  const headerStore = headers();
  const forwardedHost = headerStore.get('x-forwarded-host');
  const hostHeader = forwardedHost || headerStore.get('host') || config.defaultTenantHost;
  const tenantHost = hostHeader.split(':')[0];
  const subdomain = tenantHost.split('.')[0];
  const token = await getAuthToken();

  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  try {
    const response = await fetch(
      `${config.apiBaseUrl}/api/bookings/${encodeURIComponent(id)}/confirm`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-subdomain': subdomain,
        },
        body: JSON.stringify({}),
        cache: 'no-store',
      }
    );
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: 'API unavailable.' }, { status: 503 });
  }
}
