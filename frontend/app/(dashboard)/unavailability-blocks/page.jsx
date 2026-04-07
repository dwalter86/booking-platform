import LayoutShell from '../../../components/LayoutShell';
import DataCard from '../../../components/DataCard';
import UnavailabilityBlocksList from '../../../components/UnavailabilityBlocksList';
import { apiFetch, requireAuth } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export default async function UnavailabilityBlocksPage({ searchParams }) {
  await requireAuth();

  const [blocksResponse, resourcesResponse] = await Promise.all([
    apiFetch('/api/unavailability-blocks'),
    apiFetch('/api/resources')
  ]);

  const blocks = blocksResponse.ok ? await blocksResponse.json() : [];
  const resources = resourcesResponse.ok ? await resourcesResponse.json() : [];
  const error = searchParams?.error || '';
  const success = searchParams?.success || '';

  return (
    <LayoutShell title="Unavailability blocks">
      {success ? <div className="alert alert-success">{success}</div> : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}

      <DataCard title="Create unavailability block">
        <form action="/unavailability-actions/create" method="post">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Resource</label>
              <select className="form-select" name="resource_id" required>
                <option value="">Select a resource</option>
                {resources.map((resource) => (
                  <option key={resource.id} value={resource.id}>{resource.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Start</label>
              <input className="form-control" type="datetime-local" name="start_at" required />
            </div>
            <div className="col-md-4">
              <label className="form-label">End</label>
              <input className="form-control" type="datetime-local" name="end_at" required />
            </div>
            <div className="col-12">
              <label className="form-label">Reason</label>
              <textarea className="form-control" name="reason" rows="3" placeholder="Maintenance, private use, event prep, etc." />
            </div>
            <div className="col-12">
              <button className="btn btn-primary" type="submit">Create block</button>
            </div>
          </div>
        </form>
      </DataCard>

      <DataCard title="Manage unavailability blocks">
        <UnavailabilityBlocksList blocks={blocks} resources={resources} />
      </DataCard>
    </LayoutShell>
  );
}
