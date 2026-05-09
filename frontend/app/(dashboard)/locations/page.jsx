import Link from 'next/link';
import LayoutShell from '../../../components/LayoutShell';
import { requireAuth, apiFetch } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export default async function LocationsPage({ searchParams }) {
  await requireAuth();

  const locationsRes = await apiFetch('/api/locations');
  const locations = locationsRes.ok ? await locationsRes.json().catch(() => []) : [];

  const selectedLocationId = searchParams?.location_id || '';
  const selectedLocation = locations.find(l => l.id === selectedLocationId) || null;
  const isAddPanel = searchParams?.add === '1';
  const success = searchParams?.success || '';
  const error = searchParams?.error || '';

  return (
    <LayoutShell title="Locations">
      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-4">
        <div className={selectedLocation || isAddPanel ? 'col-lg-7' : 'col-12'}>
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h3 className="card-title">Locations</h3>
              <Link className="btn btn-sm btn-primary" href="/locations?add=1">
                Add location
              </Link>
            </div>
            <div className="table-responsive">
              <table className="table table-vcenter card-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>City</th>
                    <th>Postcode</th>
                    <th>Country</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {locations.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-secondary">
                        No locations yet. Add your first location to get started.
                      </td>
                    </tr>
                  ) : locations.map((loc) => {
                    const isSelected = loc.id === selectedLocationId;
                    return (
                      <tr key={loc.id} className={isSelected ? 'table-active' : undefined}>
                        <td><strong>{loc.name}</strong></td>
                        <td>{loc.city || '—'}</td>
                        <td>{loc.postcode || '—'}</td>
                        <td>{loc.country || '—'}</td>
                        <td>
                          <span className={`badge ${loc.is_active ? 'bg-green-lt' : 'bg-red-lt'}`}>
                            {loc.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="text-end">
                          <Link
                            className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline-primary'}`}
                            href={`/locations?location_id=${loc.id}`}
                          >
                            Edit
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

        {(selectedLocation || isAddPanel) && (
          <div className="col-lg-5 panel-slide-in">
            <div className="card">
              <div className="card-header d-flex align-items-center justify-content-between"
                style={{ backgroundColor: '#1e2a78', color: '#ffffff' }}>
                <h3 className="card-title" style={{ color: '#ffffff' }}>
                  {isAddPanel ? 'Add location' : 'Edit location'}
                </h3>
                <Link
                  href="/locations"
                  className="btn btn-sm btn-outline-light"
                  aria-label="Close"
                >
                  Close
                </Link>
              </div>
              <div className="card-body">
                <form action={isAddPanel ? '/location-actions/create' : '/location-actions/update'} method="post">
                  {!isAddPanel && (
                    <input type="hidden" name="location_id" value={selectedLocation.id} />
                  )}

                  <div className="mb-3">
                    <label className="form-label">Name <span className="text-danger">*</span></label>
                    <input
                      className="form-control"
                      type="text"
                      name="name"
                      defaultValue={selectedLocation?.name || ''}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Address line 1</label>
                    <input
                      className="form-control"
                      type="text"
                      name="address_line_1"
                      defaultValue={selectedLocation?.address_line_1 || ''}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Address line 2</label>
                    <input
                      className="form-control"
                      type="text"
                      name="address_line_2"
                      defaultValue={selectedLocation?.address_line_2 || ''}
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label">City</label>
                      <input
                        className="form-control"
                        type="text"
                        name="city"
                        defaultValue={selectedLocation?.city || ''}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Postcode</label>
                      <input
                        className="form-control"
                        type="text"
                        name="postcode"
                        defaultValue={selectedLocation?.postcode || ''}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Country</label>
                    <select
                      className="form-select"
                      name="country"
                      defaultValue={selectedLocation?.country || 'GB'}
                    >
                      <option value="GB">United Kingdom</option>
                      <option value="IE">Ireland</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                      <option value="NL">Netherlands</option>
                      <option value="ES">Spain</option>
                      <option value="IT">Italy</option>
                      <option value="US">United States</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        name="is_active"
                        value="true"
                        defaultChecked={selectedLocation ? selectedLocation.is_active : true}
                      />
                      <span className="form-check-label">Active</span>
                    </label>
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <button className="btn btn-primary" type="submit">
                      {isAddPanel ? 'Create location' : 'Save changes'}
                    </button>
                  </div>
                </form>
                {!isAddPanel && (
                  <form action="/location-actions/delete" method="post"
                    onSubmit={(e) => { if (!confirm('Delete this location?')) e.preventDefault(); }}>
                    <input type="hidden" name="location_id" value={selectedLocation.id} />
                    <button className="btn btn-outline-danger btn-sm" type="submit">
                      Delete
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
