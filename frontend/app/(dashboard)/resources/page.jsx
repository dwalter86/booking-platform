import Link from 'next/link';
import LayoutShell from '../../../components/LayoutShell';
import { apiFetch, requireAuth } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

function asValue(value, fallback = '') {
  return value === null || value === undefined ? fallback : String(value);
}

function checked(value) {
  return Boolean(value);
}

function bookingModeLabel(mode) {
  if (mode === 'availability_only') return 'Availability only';
  if (mode === 'hybrid') return 'Hybrid';
  return 'Free';
}

export default async function ResourcesPage({ searchParams }) {
  await requireAuth();
  const response = await apiFetch('/api/resources');
  const rows = response.ok ? await response.json() : [];
  const error = searchParams?.error || '';
  const success = searchParams?.success || '';

  const selectedResourceId = searchParams?.resource_id || '';
  const isAdding = searchParams?.add === '1';
  const selectedResource = Array.isArray(rows)
    ? rows.find((r) => r.id === selectedResourceId) || null
    : null;

  const addResourceButton = (
    <Link className="btn btn-primary" href="/resources?add=1">
      Add resource
    </Link>
  );

  return (
    <LayoutShell title="Resources" headerAction={addResourceButton}>
      {success ? <div className="alert alert-success">{success}</div> : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Resource list</h3>
            </div>
            <div className="table-responsive">
              <table className="table table-vcenter card-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Capacity</th>
                    <th>Booking mode</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {!Array.isArray(rows) || rows.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-secondary">No resources found. Click Add resource to create one.</td>
                    </tr>
                  ) : rows.map((row) => {
                    const isSelected = row.id === selectedResourceId;
                    return (
                      <tr key={row.id} className={isSelected ? 'table-active' : undefined}>
                        <td>
                          <div>{row.name}</div>
                          <div className="text-secondary small">{row.slug}</div>
                        </td>
                        <td>
                          <span className={`badge ${row.is_active ? 'bg-green-lt' : 'bg-red-lt'}`}>
                            {row.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>{row.capacity}</td>
                        <td>{bookingModeLabel(row.booking_mode)}</td>
                        <td>
                          <Link
                            className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline-primary'}`}
                            href={`/resources?resource_id=${row.id}`}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h3 className="card-title">
                {isAdding ? 'New resource' : selectedResource ? selectedResource.name : 'Resource details'}
              </h3>
              {selectedResource && (
                <form action="/resource-actions/delete" method="post">
                  <input type="hidden" name="id" value={selectedResource.id} />
                  <button className="btn btn-sm btn-outline-danger" type="submit">Delete</button>
                </form>
              )}
            </div>
            <div className="card-body">
              {!isAdding && !selectedResource ? (
                <div className="text-secondary">Select a resource to view details, or click Add resource to create a new one.</div>
              ) : isAdding ? (
                <form action="/resource-actions/create" method="post">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">Name</label>
                      <input className="form-control" type="text" name="name" required />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Slug</label>
                      <input className="form-control" type="text" name="slug" placeholder="meeting-room-a" required />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Description</label>
                      <textarea className="form-control" name="description" rows="3" />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Capacity</label>
                      <input className="form-control" type="number" min="1" name="capacity" defaultValue="1" required />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Booking mode</label>
                      <select className="form-select" name="booking_mode" defaultValue="free">
                        <option value="free">Free</option>
                        <option value="availability_only">Availability only</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Timezone</label>
                      <input className="form-control" type="text" name="timezone" defaultValue="Europe/London" placeholder="e.g. Europe/London" />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Max booking hours</label>
                      <input className="form-control" type="number" step="0.5" min="0" name="max_booking_duration_hours" />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Min notice hours</label>
                      <input className="form-control" type="number" min="0" name="min_notice_hours" defaultValue="0" />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Max advance days</label>
                      <input className="form-control" type="number" min="0" name="max_advance_booking_days" />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Buffer before (mins)</label>
                      <input className="form-control" type="number" min="0" name="buffer_before_minutes" defaultValue="0" />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Buffer after (mins)</label>
                      <input className="form-control" type="number" min="0" name="buffer_after_minutes" defaultValue="0" />
                    </div>
                    <div className="col-12">
                      <label className="form-check">
                        <input className="form-check-input" type="checkbox" name="is_active" defaultChecked />
                        <span className="form-check-label">Resource is active</span>
                      </label>
                    </div>
                    <div className="col-12 d-flex gap-2">
                      <button className="btn btn-primary" type="submit">Create resource</button>
                      <Link className="btn btn-outline-secondary" href="/resources">Cancel</Link>
                    </div>
                  </div>
                </form>
              ) : (
                <form action="/resource-actions/update" method="post">
                  <input type="hidden" name="id" value={selectedResource.id} />
                  <input type="hidden" name="return_resource_id" value={selectedResource.id} />
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">Name</label>
                      <input className="form-control" type="text" name="name" defaultValue={asValue(selectedResource.name)} required />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Slug</label>
                      <input className="form-control" type="text" name="slug" defaultValue={asValue(selectedResource.slug)} required />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Description</label>
                      <textarea className="form-control" name="description" rows="3" defaultValue={asValue(selectedResource.description)} />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Capacity</label>
                      <input className="form-control" type="number" min="1" name="capacity" defaultValue={asValue(selectedResource.capacity, '1')} required />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Booking mode</label>
                      <select className="form-select" name="booking_mode" defaultValue={asValue(selectedResource.booking_mode, 'free')}>
                        <option value="free">Free</option>
                        <option value="availability_only">Availability only</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Timezone</label>
                      <input className="form-control" type="text" name="timezone" defaultValue={asValue(selectedResource.timezone, 'Europe/London')} placeholder="e.g. Europe/London" />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Max booking hours</label>
                      <input className="form-control" type="number" step="0.5" min="0" name="max_booking_duration_hours" defaultValue={asValue(selectedResource.max_booking_duration_hours)} />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Min notice hours</label>
                      <input className="form-control" type="number" min="0" name="min_notice_hours" defaultValue={asValue(selectedResource.min_notice_hours, '0')} />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Max advance days</label>
                      <input className="form-control" type="number" min="0" name="max_advance_booking_days" defaultValue={asValue(selectedResource.max_advance_booking_days)} />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Buffer before (mins)</label>
                      <input className="form-control" type="number" min="0" name="buffer_before_minutes" defaultValue={asValue(selectedResource.buffer_before_minutes, '0')} />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Buffer after (mins)</label>
                      <input className="form-control" type="number" min="0" name="buffer_after_minutes" defaultValue={asValue(selectedResource.buffer_after_minutes, '0')} />
                    </div>
                    <div className="col-12">
                      <label className="form-check">
                        <input className="form-check-input" type="checkbox" name="is_active" defaultChecked={checked(selectedResource.is_active)} />
                        <span className="form-check-label">Resource is active</span>
                      </label>
                    </div>
                    <div className="col-12">
                      <button className="btn btn-primary" type="submit">Save changes</button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
