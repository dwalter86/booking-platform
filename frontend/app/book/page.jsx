export const dynamic = 'force-dynamic';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

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

export default async function PublicBookingIndexPage() {
  const subdomain = getTenantSubdomain();
  const { resources, tenant, error } = await getResources(subdomain);

  // Booking disabled
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

  // API error
  if (error && resources.length === 0) {
    return (
      <div className="page page-center">
        <div className="container py-4">
          <div className="row justify-content-center">
            <div className="col-lg-6 text-center">
              <p className="text-muted">Booking is not available right now. Please try again shortly.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Single resource — redirect straight to its booking page
  if (resources.length === 1) {
    redirect(`/book/${resources[0].slug}`);
  }

  // Multiple resources — show picker
  const tenantLogoUrl = tenant?.logo_url || '';
  const tenantBrandColour = tenant?.brand_colour || '';

  return (
    <div className="page page-center">
      <div className="container py-4">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card">
              <div className="card-header" style={tenantBrandColour ? { borderTop: `3px solid ${tenantBrandColour}` } : {}}>
                <div className="d-flex align-items-center gap-3">
                  {tenantLogoUrl && (
                    <img src={tenantLogoUrl} alt="" style={{ height: 36, width: 'auto', objectFit: 'contain' }} />
                  )}
                  <h2 className="card-title mb-0">
                    {tenant?.name ? `Book with ${tenant.name}` : 'Make a booking'}
                  </h2>
                </div>
              </div>
              <div className="card-body">
                <p className="text-muted mb-4">Select what you'd like to book:</p>
                <div className="row g-3">
                  {resources.map(r => (
                    <div key={r.id} className="col-md-6">
                      <a href={`/book/${r.slug}`} className="card card-link h-100" style={{ textDecoration: 'none' }}>
                        <div className="card-body">
                          <h4 className="card-title">{r.name}</h4>
                          {r.description && (
                            <p className="text-muted small mb-2">{r.description}</p>
                          )}
                          <div className="d-flex gap-3 mt-auto" style={{ fontSize: 12, color: '#868e96' }}>
                            <span>Capacity: {r.capacity}</span>
                            {r.max_booking_duration_hours && (
                              <span>Max: {Number(r.max_booking_duration_hours)}h</span>
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
      </div>
    </div>
  );
}
