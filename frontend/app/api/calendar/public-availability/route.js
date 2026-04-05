import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { config } from '../../../../lib/config';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const resourceId = searchParams.get('resource_id') || '';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';

  const headerStore = headers();
  const forwardedHost = headerStore.get('x-forwarded-host');
  const hostHeader = forwardedHost || headerStore.get('host') || config.defaultTenantHost;
  const tenantHost = hostHeader.split(':')[0];
  const tenantSubdomain = tenantHost.split('.')[0];

  try {
    const upstream = await fetch(
      `${config.apiBaseUrl}/api/availability?resource_id=${encodeURIComponent(resourceId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-subdomain': tenantSubdomain
        },
        cache: 'no-store'
      }
    );

    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'Unable to load availability.' }, { status: 502 });
  }
}
