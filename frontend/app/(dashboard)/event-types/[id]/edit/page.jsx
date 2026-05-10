import Link from 'next/link';
import LayoutShell from '../../../../../components/LayoutShell';
import { apiFetch, requireAuth } from '../../../../../lib/auth';
import EventTypeForm from '../../../../../components/EventTypeForm';
import DeleteEventTypeButton from '../../../../../components/DeleteEventTypeButton';
// ResourceMeetingTypes now rendered inside EventTypeForm

export const dynamic = 'force-dynamic';

function asValue(value, fallback = '') {
  return value === null || value === undefined ? fallback : String(value);
}

export default async function EventTypeEditPage({ params, searchParams }) {
  await requireAuth();
  const { id } = params;

  const [eventTypeRes, subscriptionRes] = await Promise.all([
    apiFetch(`/api/event-types/${id}`),
    apiFetch('/api/plans/subscription'),
  ]);

  if (!eventTypeRes.ok) {
    return (
      <LayoutShell title="Event type not found">
        <div className="alert alert-danger">Event type not found or you do not have access.</div>
        <Link href="/resources" className="btn btn-outline-secondary btn-sm">← Resources</Link>
      </LayoutShell>
    );
  }

  const eventType    = await eventTypeRes.json();
  const subscription = subscriptionRes.ok ? await subscriptionRes.json() : null;

  const success  = searchParams?.success   || '';
  const error    = searchParams?.error     || '';
  const returnTo = searchParams?.return_to || `/resources/${eventType.resource_id}/edit`;

  const resourcesRes = await apiFetch('/api/resources');
  const resources    = resourcesRes.ok ? await resourcesRes.json() : [];
  const resource     = Array.isArray(resources)
    ? resources.find(r => r.id === eventType.resource_id) || null
    : null;

  const backLabel = returnTo.startsWith('/event-types')
    ? 'Event Types'
    : resource?.name || 'Resource';

  const backButton = (
    <Link href={returnTo} className="btn btn-sm btn-outline-secondary">
      ← {backLabel}
    </Link>
  );

  return (
    <LayoutShell title={eventType.name} headerAction={backButton}>
      {success && <div className="alert alert-success mb-4">{success}</div>}
      {error   && <div className="alert alert-danger  mb-4">{error}</div>}

      {/* ── Event type details ── */}
      <div className="card mb-4">
        <div className="card-header" style={{ backgroundColor: '#1e2a78', color: '#fff' }}>
          <div>
            <h3 className="card-title mb-1" style={{ color: '#fff' }}>Event type details</h3>
            <p className="card-subtitle mb-0" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              Public booking URL: /book/{asValue(eventType.slug)}
            </p>
          </div>
        </div>
        <div className="card-body">
          <EventTypeForm
            action="/event-type-actions/update"
            resourceId={eventType.resource_id}
            eventType={eventType}
            subscription={subscription}
            submitLabel="Save changes"
            returnTo={returnTo}
            footerAction={
              <DeleteEventTypeButton
                eventTypeId={eventType.id}
                resourceId={eventType.resource_id}
              />
            }
          />
        </div>
      </div>

      {/* Meeting types moved into EventTypeForm */}

    </LayoutShell>
  );
}
