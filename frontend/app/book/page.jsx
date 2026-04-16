export const dynamic = 'force-dynamic';

import { headers } from 'next/headers';
import PublicBookingCalendarClient from '../../components/PublicBookingCalendarClient';

function getTenantSubdomain() {
  const host = headers().get('x-forwarded-host')
    || headers().get('host')
    || 'default.platform.local';
  return host.split(':')[0].split('.')[0];
}

async function getResources(subdomain) {
  try {
    const response = await fetch('http://127.0.0.1:3001/api/public-bookings/resources', {
      headers: { 'x-tenant-subdomain': subdomain },
      cache: 'no-store'
    });
    if (!response.ok) return { resources: [], tenant: null, error: 'Unable to load resources.' };
    const data = await response.json();
    return { resources: data.resources || [], tenant: data.tenant || null, error: '' };
  } catch {
    return { resources: [], tenant: null, error: 'Booking API unavailable.' };
  }
}

async function getDraft(subdomain, token) {
  if (!token) return { draft: null, draftExpired: false };
  try {
    const response = await fetch(
      `http://127.0.0.1:3001/api/public-bookings/draft/${encodeURIComponent(token)}`,
      {
        headers: { 'x-tenant-subdomain': subdomain },
        cache: 'no-store'
      }
    );
    if (!response.ok) return { draft: null, draftExpired: false };
    const data = await response.json();
    if (data.expired) return { draft: null, draftExpired: true };
    return { draft: data, draftExpired: false };
  } catch {
    return { draft: null, draftExpired: false };
  }
}

export default async function PublicBookingPage({ searchParams }) {
  const subdomain = getTenantSubdomain();
  const draftToken = searchParams?.draft || null;

  const [{ resources, tenant, error }, { draft, draftExpired }] = await Promise.all([
    getResources(subdomain),
    getDraft(subdomain, draftToken),
  ]);
  
  const tenantLogoUrl    = tenant?.logo_url     || '';
  const tenantBrandColour = tenant?.brand_colour || '';

  if (tenant && tenant.public_booking_enabled === false) {
    return (
      <div className="page page-center">
        <div className="container py-4">
          <div className="row justify-content-center">
            <div className="col-lg-6 text-center">
              <div className="card">
                <div className="card-body py-5">
                  <div className="mb-3" style={{ fontSize: 48 }}>🔒</div>
                  <h3>{tenant.name}</h3>
                  <p className="text-muted">
                    Online booking is not currently available. Please contact us directly to make a booking.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );  
  }

  return (
    <div className="page page-center">
      <div className="container py-4">
        <div className="row justify-content-center">
          <div className="col-lg-10">
            <div className="card">
              <div className="card-header" style={tenantBrandColour ? { borderTop: `3px solid ${tenantBrandColour}` } : {}}>
                <div className="d-flex align-items-center gap-3">
                  {tenantLogoUrl && (
                    <img
                      src={tenantLogoUrl}
                      alt=""
                      style={{ height: 36, width: 'auto', objectFit: 'contain' }}
                    />
                  )}
                  <h2 className="card-title mb-0">
                    {tenant?.name ? `Book with ${tenant.name}` : 'Make a booking'}
                  </h2>
                </div>
              </div>
              <div className="card-body">
                <PublicBookingCalendarClient
                  resources={resources}
                  apiError={error}
                  initialDraft={draft}
                  draftExpired={draftExpired}
                  draftToken={draftToken}
                  confirmationMessage={tenant?.booking_confirmation_message || ''}
                  tenantLogoUrl={tenant?.logo_url || ''}
                  tenantBrandColour={tenant?.brand_colour || ''}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
