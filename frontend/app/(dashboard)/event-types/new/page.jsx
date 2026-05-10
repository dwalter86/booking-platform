import Link from 'next/link';
import LayoutShell from '../../../../components/LayoutShell';
import { apiFetch, requireAuth } from '../../../../lib/auth';
import EventTypeForm from '../../../../components/EventTypeForm';

export const dynamic = 'force-dynamic';

export default async function EventTypeNewPage({ searchParams }) {
  await requireAuth();

  const resourceId = searchParams?.resource_id || '';
  const error      = searchParams?.error || '';

  if (!resourceId) {
    return (
      <LayoutShell title="New event type">
        <div className="alert alert-danger">No resource specified. Please go back and try again.</div>
        <Link href="/resources" className="btn btn-outline-secondary btn-sm">← Resources</Link>
      </LayoutShell>
    );
  }

  const [resourcesRes, subscriptionRes] = await Promise.all([
    apiFetch('/api/resources'),
    apiFetch('/api/plans/subscription'),
  ]);

  const resources    = resourcesRes.ok    ? await resourcesRes.json()    : [];
  const subscription = subscriptionRes.ok ? await subscriptionRes.json() : null;
  const resource     = Array.isArray(resources) ? resources.find(r => r.id === resourceId) || null : null;

  if (!resource) {
    return (
      <LayoutShell title="New event type">
        <div className="alert alert-danger">Resource not found.</div>
        <Link href="/resources" className="btn btn-outline-secondary btn-sm">← Resources</Link>
      </LayoutShell>
    );
  }

  const backButton = (
    <Link href={`/resources/${resourceId}/edit`} className="btn btn-sm btn-outline-secondary">
      ← {resource.name}
    </Link>
  );

  return (
    <LayoutShell title="New event type" headerAction={backButton}>
      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <div className="card">
        <div className="card-header" style={{ backgroundColor: '#1e2a78', color: '#fff' }}>
          <div>
            <h3 className="card-title mb-1" style={{ color: '#fff' }}>Event type details</h3>
            <p className="card-subtitle mb-0" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              Creating for: {resource.name}
            </p>
          </div>
        </div>
        <div className="card-body">
          <EventTypeForm
            action="/event-type-actions/create"
            resourceId={resourceId}
            subscription={subscription}
            submitLabel="Create event type"
          />
        </div>
      </div>
    </LayoutShell>
  );
}
