import LayoutShell from '../../../components/LayoutShell';
import DataCard from '../../../components/DataCard';
import { apiFetch, requireAuth } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

function asValue(value, fallback = '') {
  return value === null || value === undefined ? fallback : String(value);
}

function checked(value) {
  return Boolean(value);
}

export default async function ResourcesPage({ searchParams }) {
  await requireAuth();
  const response = await apiFetch('/api/resources');
  const rows = response.ok ? await response.json() : [];
  const error = searchParams?.error || '';
  const success = searchParams?.success || '';

  return (
    <LayoutShell title="Resources">
      {success ? <div className="alert alert-success">{success}</div> : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}

      <DataCard title="Create resource">
        <form action="/resource-actions/create" method="post">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Name</label>
              <input className="form-control" type="text" name="name" required />
            </div>
            <div className="col-md-6">
              <label className="form-label">Slug</label>
              <input className="form-control" type="text" name="slug" placeholder="meeting-room-a" required />
            </div>
            <div className="col-12">
              <label className="form-label">Description</label>
              <textarea className="form-control" name="description" rows="3" />
            </div>
            <div className="col-md-3">
              <label className="form-label">Capacity</label>
              <input className="form-control" type="number" min="1" name="capacity" defaultValue="1" required />
            </div>
            <div className="col-md-3">
              <label className="form-label">Booking mode</label>
              <select className="form-select" name="booking_mode" defaultValue="free">
                <option value="free">Free</option>
                <option value="availability_only">Availability only</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Timezone</label>
              <input className="form-control" type="text" name="timezone" defaultValue="UTC" />
            </div>
            <div className="col-md-3">
              <label className="form-label">Maximum booking hours</label>
              <input className="form-control" type="number" step="0.5" min="0" name="max_booking_duration_hours" />
            </div>
            <div className="col-md-3">
              <label className="form-label">Minimum notice hours</label>
              <input className="form-control" type="number" min="0" name="min_notice_hours" defaultValue="0" />
            </div>
            <div className="col-md-3">
              <label className="form-label">Maximum advance days</label>
              <input className="form-control" type="number" min="0" name="max_advance_booking_days" />
            </div>
            <div className="col-md-3">
              <label className="form-label">Buffer before (minutes)</label>
              <input className="form-control" type="number" min="0" name="buffer_before_minutes" defaultValue="0" />
            </div>
            <div className="col-md-3">
              <label className="form-label">Buffer after (minutes)</label>
              <input className="form-control" type="number" min="0" name="buffer_after_minutes" defaultValue="0" />
            </div>
            <div className="col-12">
              <label className="form-check">
                <input className="form-check-input" type="checkbox" name="is_active" defaultChecked />
                <span className="form-check-label">Resource is active</span>
              </label>
            </div>
            <div className="col-12">
              <button className="btn btn-primary" type="submit">Create resource</button>
            </div>
          </div>
        </form>
      </DataCard>

      <DataCard title="Manage resources">
        {Array.isArray(rows) && rows.length ? (
          <div className="d-flex flex-column gap-4">
            {rows.map((row) => (
              <div className="card" key={row.id}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h3 className="card-title mb-1">{row.name}</h3>
                      <div className="text-secondary">
                        {row.slug} · {row.is_active ? 'Active' : 'Inactive'} · Capacity {row.capacity}
                      </div>
                    </div>
                    <form action="/resource-actions/delete" method="post">
                      <input type="hidden" name="id" value={row.id} />
                      <button className="btn btn-outline-danger" type="submit">Delete</button>
                    </form>
                  </div>

                  <form action="/resource-actions/update" method="post">
                    <input type="hidden" name="id" value={row.id} />
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Name</label>
                        <input className="form-control" type="text" name="name" defaultValue={asValue(row.name)} required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Slug</label>
                        <input className="form-control" type="text" name="slug" defaultValue={asValue(row.slug)} required />
                      </div>
                      <div className="col-12">
                        <label className="form-label">Description</label>
                        <textarea className="form-control" name="description" rows="3" defaultValue={asValue(row.description)} />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Capacity</label>
                        <input className="form-control" type="number" min="1" name="capacity" defaultValue={asValue(row.capacity, '1')} required />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Booking mode</label>
                        <select className="form-select" name="booking_mode" defaultValue={asValue(row.booking_mode, 'free')}>
                          <option value="free">Free</option>
                          <option value="availability_only">Availability only</option>
                          <option value="hybrid">Hybrid</option>
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Timezone</label>
                        <input className="form-control" type="text" name="timezone" defaultValue={asValue(row.timezone, 'UTC')} />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Maximum booking hours</label>
                        <input className="form-control" type="number" step="0.5" min="0" name="max_booking_duration_hours" defaultValue={asValue(row.max_booking_duration_hours)} />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Minimum notice hours</label>
                        <input className="form-control" type="number" min="0" name="min_notice_hours" defaultValue={asValue(row.min_notice_hours, '0')} />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Maximum advance days</label>
                        <input className="form-control" type="number" min="0" name="max_advance_booking_days" defaultValue={asValue(row.max_advance_booking_days)} />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Buffer before (minutes)</label>
                        <input className="form-control" type="number" min="0" name="buffer_before_minutes" defaultValue={asValue(row.buffer_before_minutes, '0')} />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Buffer after (minutes)</label>
                        <input className="form-control" type="number" min="0" name="buffer_after_minutes" defaultValue={asValue(row.buffer_after_minutes, '0')} />
                      </div>
                      <div className="col-12">
                        <label className="form-check">
                          <input className="form-check-input" type="checkbox" name="is_active" defaultChecked={checked(row.is_active)} />
                          <span className="form-check-label">Resource is active</span>
                        </label>
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
          <p className="mb-0">No resources found yet. Use the form above to create the first resource.</p>
        )}
      </DataCard>
    </LayoutShell>
  );
}
