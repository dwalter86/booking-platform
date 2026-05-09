import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { config } from '../../../lib/config';
import { getAuthToken } from '../../../lib/auth';

async function proxyRequest(request, method) {
  const headerStore = headers();
  const forwardedHost = headerStore.get('x-forwarded-host');
  const hostHeader = forwardedHost || headerStore.get('host') || config.defaultTenantHost;
  const subdomain = hostHeader.split(':')[0].split('.')[0];
  const token = await getAuthToken();
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const opts = { method, headers: { Authorization: `Bearer ${token}`, 'x-tenant-subdomain': subdomain }, cache: 'no-store' };
  if (method === 'POST') {
    const body = await request.json().catch(() => ({}));
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/locations`, opts);
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch { return NextResponse.json({ error: 'API unavailable.' }, { status: 503 }); }
}

export async function GET(request) { return proxyRequest(request, 'GET'); }
export async function POST(request) { return proxyRequest(request, 'POST'); }
