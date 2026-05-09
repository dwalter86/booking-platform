import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { config } from '../../../../lib/config';
import { getAuthToken } from '../../../../lib/auth';

async function proxy(request, { params }, method) {
  const headerStore = headers();
  const subdomain = (headerStore.get('x-forwarded-host') || headerStore.get('host') || '').split(':')[0].split('.')[0];
  const token = await getAuthToken();
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const opts = { method, headers: { Authorization: `Bearer ${token}`, 'x-tenant-subdomain': subdomain }, cache: 'no-store' };
  if (method === 'PUT') {
    const body = await request.json().catch(() => ({}));
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/resources/${params.id}/meeting-types`, opts);
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch { return NextResponse.json({ error: 'API unavailable.' }, { status: 503 }); }
}

export async function GET(request, ctx) { return proxy(request, ctx, 'GET'); }
export async function PUT(request, ctx) { return proxy(request, ctx, 'PUT'); }
