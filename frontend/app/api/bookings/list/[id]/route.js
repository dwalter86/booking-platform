import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { config } from '../../../../../lib/config';
import { getAuthToken } from '../../../../../lib/auth';

function getContext() {
  const headerStore = headers();
  const forwardedHost = headerStore.get('x-forwarded-host');
  const hostHeader = forwardedHost || headerStore.get('host') || config.defaultTenantHost;
  const tenantHost = hostHeader.split(':')[0];
  return tenantHost.split('.')[0];
}

export async function GET(request, { params }) {
  const { id } = params;
  const subdomain = getContext();
  const token = await getAuthToken();

  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  try {
    const response = await fetch(
      `${config.apiBaseUrl}/api/bookings/${encodeURIComponent(id)}`,
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

export async function PATCH(request, { params }) {
  const { id } = params;
  const subdomain = getContext();
  const token = await getAuthToken();

  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  try {
    const body = await request.text();
    const response = await fetch(
      `${config.apiBaseUrl}/api/bookings/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-subdomain': subdomain,
        },
        body,
        cache: 'no-store',
      }
    );
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: 'API unavailable.' }, { status: 503 });
  }
}
