export const dynamic = 'force-dynamic';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

function getTenantSubdomain() {
  const host = headers().get('x-forwarded-host')
    || headers().get('host')
    || 'default.platform.local';
  return host.split(':')[0].split('.')[0];
}

async function getEventTypes(subdomain) {
  try {
    const response = await fetch('http://127.0.0.1:3001/api/public-bookings/event-types', {
      headers: { 'x-tenant-subdomain': subdomain },
      cache: 'no-store'
    });
    if (!response.ok) return { eventTypes: [], tenant: null, error: 'Unable to load booking options.' };
    const data = await response.json();
    return { eventTypes: data.event_types || [], tenant: data.tenant || null, error: '' };
  } catch {
    return { eventTypes: [], tenant: null, error: 'Booking API unavailable.' };
  }
}

function TenantHeader({ tenant, tenantLogoUrl, tenantBrandColour }) {
  return (
    <>
      {(tenantLogoUrl || tenant?.name) && (
        <div className="d-flex align-items-center gap-3 mb-4 px-2">
          {tenantLogoUrl && (
            <img src={tenantLogoUrl} alt="" style={{ height: 36, width: 'auto', objectFit: 'contain' }} />
          )}
          {tenant?.name && (
            <span style={{ fontSize: 15, fontWeight: 500, color: '#374151' }}>{tenant.name}</span>
          )}
        </div>
      )}
      {tenantBrandColour && (
        <div style={{ height: 3, background: tenantBrandColour, borderRadius: 2, marginBottom: 24 }} />
      )}
    </>
  );
}

export default async function PublicBookingIndexPage() {
  const subdomain = getTenantSubdomain();
  const { eventTypes, tenant, error } = await getEventTypes(subdomain);

  const tenantLogoUrl     = tenant?.logo_url || '';
  const tenantBrandColour = tenant?.brand_colour || '';

  // Booking disabled
  if (tenant && tenant.public_booking_enabled === false) {
    return (
      <div className="page">
        <div className="container-xl py-4">
          <TenantHeader tenant={tenant} tenantLogoUrl={tenantLogoUrl} tenantBrandColour={tenantBrandColour} />
          <div className="card">
            <div className="card-body text-center py-5">
              <div className="mb-3" style={{ fontSize: 48 }}>🔒</div>
              <h3>{tenant.name}</h3>
              <p className="text-muted">
                Online booking is not currently available. Please contact us directly to make a booking.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // API error
  if (error && eventTypes.length === 0) {
    return (
      <div className="page">
        <div className="container-xl py-4">
          <div className="card">
            <div className="card-body text-center py-4">
              <p className="text-muted">Booking is not available right now. Please try again shortly.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No event types configured
  if (eventTypes.length === 0) {
    return (
      <div className="page">
        <div className="container-xl py-4">
          <TenantHeader tenant={tenant} tenantLogoUrl={tenantLogoUrl} tenantBrandColour={tenantBrandColour} />
          <div className="card">
            <div className="card-body text-center py-5">
              <p className="text-muted">No booking options are currently available.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Single event type — redirect straight to it
  if (eventTypes.length === 1) {
    redirect(`/book/${eventTypes[0].slug}`);
  }

  // Multiple event types — show picker
  return (
    <div className="page">
      <div className="container-xl py-4">
        <TenantHeader tenant={tenant} tenantLogoUrl={tenantLogoUrl} tenantBrandColour={tenantBrandColour} />
        <div className="card">
          <div className="card-body">
            <p className="text-muted mb-4">Select what you'd like to book:</p>
            <div className="row g-3">
              {eventTypes.map(et => (
                <div key={et.id} className="col-md-6">
                  <a
                    href={`/book/${et.slug}`}
                    className="card card-link h-100"
                    style={{ textDecoration: 'none' }}
                  >
                    <div className="card-body">
                      <h4 className="card-title">{et.name}</h4>
                      {et.description && (
                        <p className="text-muted small mb-2">{et.description}</p>
                      )}
                      <div className="d-flex gap-3 mt-auto" style={{ fontSize: 12, color: '#868e96' }}>
                        <span>{et.duration_minutes} min</span>
                        {et.resource_name && (
                          <span>{et.resource_name}</span>
                        )}
                      </div>
                    </div>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
