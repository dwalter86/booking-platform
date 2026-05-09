import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { config } from '../../../../../lib/config';
import { getAuthToken } from '../../../../../lib/auth';

export async function PUT(request, { params }) {
  const headerStore = headers();
  const subdomain = (headerStore.get('x-forwarded-host') || headerStore.get('host') || '').split(':')[0].split('.')[0];
  const token = await getAuthToken();
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/resources/${params.id}/locations`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'x-tenant-subdomain': subdomain, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch { return NextResponse.json({ error: 'API unavailable.' }, { status: 503 }); }
}
