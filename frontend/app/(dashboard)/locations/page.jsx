import Link from 'next/link';
import LayoutShell from '../../../components/LayoutShell';
import { requireAuth, apiFetch } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export default async function LocationsPage({ searchParams }) {
  await requireAuth();

  const locationsRes = await apiFetch('/api/locations');
  const locations = locationsRes.ok ? await locationsRes.json().catch(() => []) : [];

  const list = Array.isArray(locations) ? locations : [];
  const selectedLocationId = searchParams?.location_id || '';
  const selectedLocation = list.find(l => l.id === selectedLocationId) || null;
  const isAddPanel = searchParams?.add === '1';
  const success = searchParams?.success || '';
  const error = searchParams?.error || '';

  const activeCount = list.filter(l => l.is_active).length;
  const countryCount = new Set(list.map(l => l.country).filter(Boolean)).size;

  const breadcrumb = (
    <>
      <span>Workspace</span>
      <span className="av-crumb-sep">/</span>
      <span className="av-crumb-now">Locations</span>
    </>
  );

  const addButton = (
    <Link className="btn btn-primary btn-sm" href="/locations?add=1">
      Add location
    </Link>
  );

  return (
    <LayoutShell breadcrumb={breadcrumb} headerAction={addButton}>
      {success && <div className="alert alert-success mb-4">{success}</div>}
      {error && <div className="alert alert-danger mb-4">{error}</div>}

      {/* ── Page header ── */}
      <div className="av-page-header">
        <div className="av-ph-title">
          <h1>Locations</h1>
          <p>Physical places resources belong to — offices, studios, venues.</p>
        </div>
      </div>

      {/* ── Summary ── */}
      <div className="av-summary">
        <div className="av-summary-card">
          <div>
            <div className="av-sc-label">Total locations</div>
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
            <div className="av-sc-label">Countries</div>
            <div className="av-sc-value">{countryCount}</div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className={selectedLocation || isAddPanel ? 'col-lg-7' : 'col-12'}>
          <div className="av-list">
            <div className="av-list-row av-list-head cols-locations">
              <div>Name</div>
              <div>City</div>
              <div>Postcode</div>
              <div>Country</div>
              <div>Status</div>
              <div></div>
            </div>

            {list.length === 0 ? (
              <div className="av-list-row cols-locations">
                <div className="av-muted" style={{ gridColumn: '1 / -1' }}>
                  No locations yet. Add your first location to get started.
                </div>
              </div>
            ) : list.map((loc) => {
              const isSelected = loc.id === selectedLocationId;
              return (
                <div
                  key={loc.id}
                  className={`av-list-row cols-locations${isSelected ? ' selected' : ''}`}
                >
                  <div className="av-cell-name">
                    <div className="av-name">{loc.name}</div>
                  </div>
                  <div className="av-muted">{loc.city || '—'}</div>
                  <div className="av-muted">{loc.postcode || '—'}</div>
                  <div className="av-muted">{loc.country || '—'}</div>
                  <div>
                    <span className={`av-pill ${loc.is_active ? 'active' : 'inactive'}`}>
                      <span className="av-dot" />
                      {loc.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="av-row-actions">
                    <Link
                      className={`av-tiny-btn${isSelected ? ' primary' : ''}`}
                      href={`/locations?location_id=${loc.id}`}
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              );
            })}
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
