import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import BookingFormClassic from '../../../components/BookingFormClassic';
import BookingFormMinimal from '../../../components/BookingFormMinimal';
import BookingFormSplit from '../../../components/BookingFormSplit';
import BookingFormCards from '../../../components/BookingFormCards';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Server helpers
// ---------------------------------------------------------------------------

function PoweredByAvailio() {
  return (
    <div style={{ textAlign: 'center', marginTop: 32, marginBottom: 8 }}>
      <a
        href="https://myavailio.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          textDecoration: 'none',
        }}
      >
        <img
          src="/availio-logo-dark.svg"
          alt="Availio"
          style={{ height: 25, width: 'auto', opacity: 0.75 }}
        />
        <span style={{
          fontSize: 10,
          color: '#9ca3af',
          fontFamily: 'system-ui, sans-serif',
          letterSpacing: '0.02em',
        }}>
          Powered by Availio
        </span>
      </a>
    </div>
  );
}

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
      { headers: { 'x-tenant-subdomain': subdomain }, cache: 'no-store' }
    );
    if (!response.ok) return { draft: null, draftExpired: false };
    const data = await response.json();
    if (data.expired) return { draft: null, draftExpired: true };
    return { draft: data, draftExpired: false };
  } catch {
    return { draft: null, draftExpired: false };
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PublicBookingResourcePage({ params, searchParams }) {
  const subdomain = getTenantSubdomain();
  const slug = params?.slug || '';
  const draftToken = searchParams?.draft || null;

  const [{ resources, tenant, error }, { draft, draftExpired }] = await Promise.all([
    getResources(subdomain),
    getDraft(subdomain, draftToken),
  ]);

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

  // Find the specific resource by slug
  const resource = resources.find(r => r.slug === slug);
  if (!resource) notFound();

  // Pass only this resource to the form components
  // (they still accept an array but will have exactly one entry)
  const resourcesForForm = [resource];

  const tenantLogoUrl          = tenant?.logo_url || '';
  const tenantBrandColour      = tenant?.brand_colour || '';
  const removeAvailoBranding   = tenant?.remove_availio_branding ?? false;
  const formType               = resource.booking_form_type || 'classic';

  const sharedProps = {
    resources: resourcesForForm,
    apiError: error,
    initialDraft: draft,
    draftExpired,
    draftToken,
    confirmationMessage: tenant?.booking_confirmation_message || '',
    tenantLogoUrl,
    tenantBrandColour,
    removeAvailoBranding,
  };

  // Non-classic forms — full width, no Tabler card wrapper
  if (formType !== 'classic') {
    return (
      <div className="page">
        <div className="container-xl py-4">
          {/* Tenant header */}
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

          {/* Back link if tenant has multiple resources */}
          {resources.length > 1 && (
            <a href="/book" style={{ fontSize: 13, color: '#868e96', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 20, textDecoration: 'none' }}>
              ← All resources
            </a>
          )}

          {formType === 'minimal' && <BookingFormMinimal {...sharedProps} />}
          {formType === 'split'   && <BookingFormSplit   {...sharedProps} />}
          {formType === 'cards'   && <BookingFormCards   {...sharedProps} />}
          {!removeAvailoBranding && <PoweredByAvailio />}
        </div>
      </div>
    );
  }

  // Classic — aligned with new form layout
  return (
    <div className="page">
      <div className="container-xl py-4">
        {/* Tenant header — same as new forms */}
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

        {/* Back link if tenant has multiple resources */}
        {resources.length > 1 && (
          <a href="/book" style={{ fontSize: 13, color: '#868e96', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 20, textDecoration: 'none' }}>
            ← All resources
          </a>
        )}

        <div className="card">
          <div className="card-body">
            <BookingFormClassic {...sharedProps} />
          </div>
        </div>
        {!removeAvailoBranding && <PoweredByAvailio />}
      </div>
    </div>
  );
}
