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
  const selectedEventType = Array.isArray(eventTypes)
    ? eventTypes.find(et => et.id === selectedEventTypeId) || null
    : null;

  return (
    <LayoutShell title="Event Types">
      {success && <div className="alert alert-success mb-4">{success}</div>}
      {error   && <div className="alert alert-danger  mb-4">{error}</div>}

      <div className="row g-4">

        {/* ── Event type list ── */}
        <div className={selectedEventType && isSharePanel ? 'col-lg-7' : 'col-12'}>
          <div className="card">
            <div
              className="card-header d-flex align-items-center justify-content-between"
              style={{ backgroundColor: '#1e2a78', color: '#fff' }}
            >
              <div>
                <h3 className="card-title mb-1" style={{ color: '#fff' }}>Your event types</h3>
                <p className="card-subtitle mb-0" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                  Bookable formats customers can choose from — e.g. 30 min call, 60 min session.
                </p>
              </div>
              {resourceId && (
                <Link
                  href={`/event-types/new?resource_id=${resourceId}`}
                  className="btn btn-sm btn-outline-light"
                >
                  Add event type
                </Link>
              )}
            </div>

            <div className="table-responsive">
              <table className="table table-vcenter card-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Duration</th>
                    <th>Mode</th>
                    <th>Form style</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {!Array.isArray(eventTypes) || eventTypes.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-secondary">
                        No event types yet.{' '}
                        {resourceId && (
                          <Link href={`/event-types/new?resource_id=${resourceId}`}>
                            Add your first event type.
                          </Link>
                        )}
                      </td>
                    </tr>
                  ) : eventTypes.map(et => {
                    const isShareSelected = et.id === selectedEventTypeId && isSharePanel;
                    return (
                      <tr key={et.id} className={isShareSelected ? 'table-active' : undefined}>
                        <td>
                          <div>{et.name}</div>
                          <div className="text-secondary small">{et.slug}</div>
                        </td>
                        <td>{et.duration_minutes} min</td>
                        <td className="text-secondary small">{bookingModeLabel(et.booking_mode)}</td>
                        <td className="text-secondary small">{et.booking_form_type}</td>
                        <td>
                          <span className={`badge ${et.status === 'active' ? 'bg-green-lt' : 'bg-red-lt'}`}>
                            {et.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex gap-1 flex-wrap justify-content-end">
                            <Link
                              href={`/event-types/${et.id}/edit`}
                              className="btn btn-sm btn-outline-primary"
                            >
                              Edit
                            </Link>
                            <Link
                              className={`btn btn-sm ${isShareSelected ? 'btn-info' : 'btn-outline-info'}`}
                              href={`/event-types?event_type_id=${et.id}&panel=share`}
                            >
                              Share
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
