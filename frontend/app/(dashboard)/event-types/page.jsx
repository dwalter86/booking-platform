import Link from 'next/link';
import LayoutShell from '../../../components/LayoutShell';
import { apiFetch, requireAuth } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

function bookingModeLabel(mode) {
  if (mode === 'slots' || mode === 'availability_only') return 'Slots';
  if (mode === 'hybrid') return 'Hybrid';
  return 'Free';
}

export default async function EventTypesPage({ searchParams }) {
  await requireAuth();

  const [resourcesRes, subscriptionRes] = await Promise.all([
    apiFetch('/api/resources'),
    apiFetch('/api/plans/subscription'),
  ]);

  const resources    = resourcesRes.ok    ? await resourcesRes.json()    : [];
  const subscription = subscriptionRes.ok ? await subscriptionRes.json() : null;
  const isSolo       = subscription?.plan_code === 'solo';

  const success = searchParams?.success || '';
  const error   = searchParams?.error   || '';

  // For solo — use the first resource silently
  // For multi — show a resource selector (future enhancement)
  const soloResource = isSolo && Array.isArray(resources) && resources.length > 0
    ? resources[0]
    : null;

  // Fetch event types for the solo resource, or all event types
  let eventTypes = [];
  if (soloResource) {
    const etRes = await apiFetch(`/api/event-types?resource_id=${soloResource.id}`);
    eventTypes = etRes.ok ? await etRes.json() : [];
  } else {
    const etRes = await apiFetch('/api/event-types');
    eventTypes = etRes.ok ? await etRes.json() : [];
  }

  const resourceId = soloResource?.id || '';

  return (
    <LayoutShell title="Event Types">
      {success && <div className="alert alert-success mb-4">{success}</div>}
      {error   && <div className="alert alert-danger  mb-4">{error}</div>}

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
              href={`/resources/${resourceId}/edit?show=add_event_type`}
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
                      <Link href={`/resources/${resourceId}/edit?show=add_event_type`}>
                        Add your first event type.
                      </Link>
                    )}
                  </td>
                </tr>
              ) : eventTypes.map(et => (
                <tr key={et.id}>
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
                    <Link
                      href={`/resources/${et.resource_id}/edit?edit_event_type=${et.id}`}
                      className="btn btn-sm btn-outline-primary"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </LayoutShell>
  );
}
