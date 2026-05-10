import Link from 'next/link';
import LayoutShell from '../../../components/LayoutShell';
import { apiFetch, requireAuth } from '../../../lib/auth';
import CopyButton from '../../../components/CopyButton';

export const dynamic = 'force-dynamic';

// (removed booking mode and form style helpers — now on event types)

export default async function ResourcesPage({ searchParams }) {
  await requireAuth();

  const { headers } = await import('next/headers');
  const headerStore = headers();
  const forwardedHost = headerStore.get('x-forwarded-host');
  const host = forwardedHost || headerStore.get('host') || 'localhost';
  const proto = headerStore.get('x-forwarded-proto') || 'http';
  const baseUrl = `${proto}://${host}`;

  const [response, subscriptionRes] = await Promise.all([
    apiFetch('/api/resources'),
    apiFetch('/api/plans/subscription'),
  ]);

  const rows = response.ok ? await response.json() : [];
  const subscription = subscriptionRes.ok ? await subscriptionRes.json() : null;

  const error = searchParams?.error || '';
  const success = searchParams?.success || '';
  const selectedResourceId = searchParams?.resource_id || '';
  const panel = searchParams?.panel || '';
  const isSharePanel = panel === 'share';

  const selectedResource = Array.isArray(rows)
    ? rows.find(r => r.id === selectedResourceId) || null
    : null;

  return (
    <LayoutShell>
      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-4">

        {/* ── Resource list ── */}
        <div className={selectedResource && isSharePanel ? 'col-lg-7' : 'col-12'}>
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h3 className="card-title">Resources</h3>
              <Link className="btn btn-sm btn-primary" href="/resources/new">
                Add resource
              </Link>
            </div>
            <div className="table-responsive">
              <table className="table table-vcenter card-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Capacity</th>
                    <th>Timezone</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {!Array.isArray(rows) || rows.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-secondary">
                        No resources found. Click Add resource to create one.
                      </td>
                    </tr>
                  ) : rows.map(row => {
                    const isShareSelected = row.id === selectedResourceId && isSharePanel;
                    return (
                      <tr key={row.id} className={isShareSelected ? 'table-active' : undefined}>
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
                        <td className="text-secondary small">{row.timezone || 'Europe/London'}</td>
                        <td>
                          <div className="d-flex gap-1 flex-wrap justify-content-end">
                            <Link
                              className="btn btn-sm btn-outline-primary"
                              href={`/resources/${row.id}/edit`}
                            >
                              Edit
                            </Link>
                            <Link
                              className={`btn btn-sm ${isShareSelected ? 'btn-info' : 'btn-outline-info'}`}
                              href={`/resources?resource_id=${row.id}&panel=share`}
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
        {selectedResource && isSharePanel && (
          <div className="col-lg-5 panel-slide-in">
            <div className="card">
              <div
                className="card-header d-flex align-items-center justify-content-between"
                style={{ backgroundColor: '#1e2a78', color: '#ffffff' }}
              >
                <h3 className="card-title" style={{ color: '#ffffff' }}>
                  {`Share — ${selectedResource.name}`}
                </h3>
                <Link
                  href="/resources"
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
                      Share this link with customers to let them book this resource directly.
                    </p>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        readOnly
                        value={`${baseUrl}/book/${selectedResource.slug}`}
                      />
                      <CopyButton text={`${baseUrl}/book/${selectedResource.slug}`} />
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
