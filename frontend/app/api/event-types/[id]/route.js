import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { config } from '../../../../lib/config';
import { getAuthToken } from '../../../../lib/auth';

async function handler(request, { params }) {
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
    const body = request.method !== 'GET' ? await request.text() : undefined;
    const response = await fetch(
      `${config.apiBaseUrl}/api/event-types/${params.id}`,
      {
        method: request.method,
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

export const GET = handler;
export const PATCH = handler;
export const DELETE = handler;
