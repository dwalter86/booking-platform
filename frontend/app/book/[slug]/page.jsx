import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import BookingFormClassic from '../../../components/BookingFormClassic';
import BookingFormMinimal from '../../../components/BookingFormMinimal';
import BookingFormSplit from '../../../components/BookingFormSplit';
import BookingFormCards from '../../../components/BookingFormCards';

export const dynamic = 'force-dynamic';

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

export default async function PublicBookingSlugPage({ params, searchParams }) {
  const subdomain  = getTenantSubdomain();
  const slug       = params?.slug || '';
  const draftToken = searchParams?.draft || null;

  const [{ eventTypes, tenant, error }, { draft, draftExpired }] = await Promise.all([
    getEventTypes(subdomain),
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

  // Find event type by slug
  const eventType = eventTypes.find(et => et.slug === slug);
  if (!eventType) notFound();

  const tenantLogoUrl        = tenant?.logo_url || '';
  const tenantBrandColour    = tenant?.brand_colour || '';
  const removeAvailoBranding = tenant?.remove_availio_branding ?? false;
  const formType             = eventType.booking_form_type || 'classic';

  // Build a resource-shaped object for the form components from the
  // event type + embedded resource fields
  const resourceForForm = {
    id:                        eventType.resource_id,
    name:                      eventType.resource_name,
    timezone:                  eventType.resource_timezone,
    capacity:                  eventType.resource_capacity,
    booking_mode:              eventType.booking_mode,
    duration_minutes:          eventType.duration_minutes,
    min_notice_hours:          eventType.min_notice_hours,
    max_advance_booking_days:  eventType.max_advance_booking_days,
    buffer_before_minutes:     eventType.buffer_before_minutes,
    buffer_after_minutes:      eventType.buffer_after_minutes,
    has_rules:                 eventType.has_rules,
    slug:                      eventType.slug,
    booking_form_type:         eventType.booking_form_type,
    auto_confirm:              eventType.auto_confirm,
    // Pass event type id so forms can include it in booking submission
    event_type_id:             eventType.id,
    event_type_name:           eventType.name,
  };

  const sharedProps = {
    resources:           [resourceForForm],
    apiError:            error,
    initialDraft:        draft,
    draftExpired,
    draftToken,
    confirmationMessage: eventType.booking_confirmation_message
                           || tenant?.booking_confirmation_message
                           || '',
    tenantLogoUrl,
    tenantBrandColour,
    removeAvailoBranding,
  };

  // Non-classic forms — full width, no card wrapper
  if (formType !== 'classic') {
    return (
      <div className="page">
        <div className="container-xl py-4">
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
          {eventTypes.length > 1 && (
            <a href="/book" style={{ fontSize: 13, color: '#868e96', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 20, textDecoration: 'none' }}>
              ← All options
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

  // Classic
  return (
    <div className="page">
      <div className="container-xl py-4">
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
        {eventTypes.length > 1 && (
          <a href="/book" style={{ fontSize: 13, color: '#868e96', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 20, textDecoration: 'none' }}>
            ← All options
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
