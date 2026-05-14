import Link from 'next/link';
import LayoutShell from '../../../components/LayoutShell';
import { apiFetch, requireAuth } from '../../../lib/auth';
import CopyButton from '../../../components/CopyButton';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

function bookingModeLabel(mode) {
  if (mode === 'slots' || mode === 'availability_only') return 'Slots';
  if (mode === 'hybrid') return 'Hybrid';
  return 'Free';
}

export default async function EventTypesPage({ searchParams }) {
  await requireAuth();

  const headerStore = headers();
  const forwardedHost = headerStore.get('x-forwarded-host');
  const host = forwardedHost || headerStore.get('host') || 'localhost';
  const proto = headerStore.get('x-forwarded-proto') || 'http';
  const baseUrl = `${proto}://${host}`;

  const [resourcesRes, subscriptionRes] = await Promise.all([
    apiFetch('/api/resources'),
    apiFetch('/api/plans/subscription'),
  ]);

  const resources    = resourcesRes.ok    ? await resourcesRes.json()    : [];
  const subscription = subscriptionRes.ok ? await subscriptionRes.json() : null;
  const isSolo       = subscription?.plan_code === 'solo';

  const success = searchParams?.success || '';
  const error   = searchParams?.error   || '';
  const selectedEventTypeId = searchParams?.event_type_id || '';
  const panel = searchParams?.panel || '';
  const isSharePanel = panel === 'share';

  const soloResource = isSolo && Array.isArray(resources) && resources.length > 0
    ? resources[0]
    : null;

  let eventTypes = [];
  if (soloResource) {
    const etRes = await apiFetch(`/api/event-types?resource_id=${soloResource.id}`);
    eventTypes = etRes.ok ? await etRes.json() : [];
  } else {
    const etRes = await apiFetch('/api/event-types');
    eventTypes = etRes.ok ? await etRes.json() : [];
  }

  const resourceId = soloResource?.id || '';
  const list = Array.isArray(eventTypes) ? eventTypes : [];
  const selectedEventType = list.find(et => et.id === selectedEventTypeId) || null;

  const activeCount = list.filter(et => et.status === 'active').length;
  const avgDuration = list.length
    ? Math.round(list.reduce((sum, et) => sum + (Number(et.duration_minutes) || 0), 0) / list.length)
    : 0;

  const breadcrumb = (
    <>
      <span>Workspace</span>
      <span className="av-crumb-sep">/</span>
      <span className="av-crumb-now">Event Types</span>
    </>
  );

  const addButton = resourceId ? (
    <Link className="btn btn-primary btn-sm" href={`/event-types/new?resource_id=${resourceId}`}>
      Add event type
    </Link>
  ) : null;

  return (
    <LayoutShell breadcrumb={breadcrumb} headerAction={addButton}>
      {success && <div className="alert alert-success mb-4">{success}</div>}
      {error   && <div className="alert alert-danger  mb-4">{error}</div>}

      {/* ── Page header ── */}
      <div className="av-page-header">
        <div className="av-ph-title">
          <h1>Event Types</h1>
          <p>Bookable formats customers can choose from — e.g. 30 min call, 60 min session.</p>
        </div>
      </div>

      {/* ── Summary ── */}
      <div className="av-summary">
        <div className="av-summary-card">
          <div>
            <div className="av-sc-label">Total event types</div>
            <div className="av-sc-value">{list.length}</div>
          </div>
        </div>
        <div className="av-summary-card">
          <div>
            <div className="av-sc-label">Active</div>
            <div className="av-sc-value">{activeCount}</div>
            <div className="av-sc-sub">of {list.length}</div>
          </div>
        </div>
        <div className="av-summary-card">
          <div>
            <div className="av-sc-label">Inactive</div>
            <div className="av-sc-value">{list.length - activeCount}</div>
          </div>
        </div>
        <div className="av-summary-card">
          <div>
            <div className="av-sc-label">Avg duration</div>
            <div className="av-sc-value">{avgDuration}</div>
            <div className="av-sc-sub">minutes</div>
          </div>
        </div>
      </div>

      <div className="row g-4">

        {/* ── Event type list ── */}
        <div className={selectedEventType && isSharePanel ? 'col-lg-7' : 'col-12'}>
          <div className="av-list">
            <div className="av-list-row av-list-head cols-events">
              <div></div>
              <div>Name</div>
              <div>Resource</div>
              <div>Duration</div>
              <div>Mode</div>
              <div>Form style</div>
              <div>Status</div>
              <div></div>
            </div>

            {list.length === 0 ? (
              <div className="av-list-row cols-events">
                <div className="av-muted" style={{ gridColumn: '1 / -1' }}>
                  No event types yet.{' '}
                  {resourceId && (
                    <Link href={`/event-types/new?resource_id=${resourceId}`}>
                      Add your first event type.
                    </Link>
                  )}
                </div>
              </div>
            ) : list.map(et => {
              const isShareSelected = et.id === selectedEventTypeId && isSharePanel;
              return (
                <div
                  key={et.id}
                  className={`av-list-row cols-events${isShareSelected ? ' selected' : ''}`}
                >
                  <span
                    className="av-evt-swatch"
                    style={{ background: et.colour || '#1e2a78' }}
                  />
                  <div className="av-cell-name">
                    <div className="av-name">{et.name}</div>
                    <div className="av-slug">{et.slug}</div>
                  </div>
                  <div className="av-muted">{et.resource_name || '—'}</div>
                  <div className="av-muted">{et.duration_minutes} min</div>
                  <div className="av-muted">{bookingModeLabel(et.booking_mode)}</div>
                  <div className="av-muted">{et.booking_form_type}</div>
                  <div>
                    <span className={`av-pill ${et.status === 'active' ? 'active' : 'inactive'}`}>
                      <span className="av-dot" />
                      {et.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="av-row-actions">
                    <Link
                      className="av-tiny-btn primary"
                      href={`/event-types/${et.id}/edit?return_to=/event-types`}
                    >
                      Edit
                    </Link>
                    <Link
                      className="av-tiny-btn"
                      href={`/event-types?event_type_id=${et.id}&panel=share`}
                    >
                      Share
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Share panel ── */}
        {selectedEventType && isSharePanel && (
          <div className="col-lg-5 panel-slide-in">
            <div className="card">
              <div
                className="card-header d-flex align-items-center justify-content-between"
                style={{ backgroundColor: '#1e2a78', color: '#ffffff' }}
              >
                <h3 className="card-title" style={{ color: '#ffffff' }}>
                  {`Share — ${selectedEventType.name}`}
                </h3>
                <Link
                  href="/event-types"
                  className="btn btn-sm btn-outline-light"
                  aria-label="Close"
                >
                  Close
                </Link>
              </div>
              <div className="card-body">
                <div className="d-flex flex-column gap-4">

                  {/* Public URL */}
                  <div>
                    <h4 className="mb-1">Public booking URL</h4>
                    <p className="text-secondary small mb-3">
                      Share this link with customers to let them book this event type directly.
                    </p>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        readOnly
                        value={`${baseUrl}/book/${selectedEventType.slug}`}
                      />
                      <CopyButton text={`${baseUrl}/book/${selectedEventType.slug}`} />
                    </div>
                  </div>

                  {/* Embed guide */}
                  <div>
                    <h4 className="mb-1">Embed guide</h4>
                    <p className="text-secondary small mb-0">
                      Instructions for embedding this booking form on your website will appear here.
                    </p>
                    <div className="rounded border bg-light p-3 mt-2 text-secondary small">
                      Coming soon
                    </div>
                  </div>

                  {/* Embed code */}
                  <div>
                    <h4 className="mb-1">Embed code</h4>
                    <p className="text-secondary small mb-0">
                      Copy and paste this snippet into your website to embed the booking form.
                    </p>
                    <div className="rounded border bg-light p-3 mt-2 text-secondary small font-monospace">
                      Coming soon
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </LayoutShell>
  );
}
