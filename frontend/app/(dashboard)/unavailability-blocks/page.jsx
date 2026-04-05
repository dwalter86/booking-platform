import LayoutShell from '../../../components/LayoutShell';
import DataCard from '../../../components/DataCard';
import { apiFetch, requireAuth } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

function formatDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return local.toISOString().slice(0, 16);
}

function formatDisplay(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function asValue(value, fallback = '') {
  return value === null || value === undefined ? fallback : String(value);
}

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
        {Array.isArray(blocks) && blocks.length ? (
          <div className="d-flex flex-column gap-4">
            {blocks.map((block) => (
              <div className="card" key={block.id}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h3 className="card-title mb-1">{block.resource_name || 'Resource'}</h3>
                      <div className="text-secondary">
                        {formatDisplay(block.start_at)} → {formatDisplay(block.end_at)}
                      </div>
                    </div>
                    <form action="/unavailability-actions/delete" method="post">
                      <input type="hidden" name="id" value={block.id} />
                      <button className="btn btn-outline-danger" type="submit">Delete</button>
                    </form>
                  </div>

                  <form action="/unavailability-actions/update" method="post">
                    <input type="hidden" name="id" value={block.id} />
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label">Resource</label>
                        <select className="form-select" name="resource_id" defaultValue={asValue(block.resource_id)} required>
                          <option value="">Select a resource</option>
                          {resources.map((resource) => (
                            <option key={resource.id} value={resource.id}>{resource.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Start</label>
                        <input className="form-control" type="datetime-local" name="start_at" defaultValue={formatDateTimeLocal(block.start_at)} required />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">End</label>
                        <input className="form-control" type="datetime-local" name="end_at" defaultValue={formatDateTimeLocal(block.end_at)} required />
                      </div>
                      <div className="col-12">
                        <label className="form-label">Reason</label>
                        <textarea className="form-control" name="reason" rows="3" defaultValue={asValue(block.reason)} />
                      </div>
                      <div className="col-12">
                        <button className="btn btn-primary" type="submit">Save changes</button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-secondary mb-0">No unavailability blocks have been created yet.</p>
        )}
      </DataCard>
    </LayoutShell>
  );
}
