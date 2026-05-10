import Link from 'next/link';
import LayoutShell from '../../../components/LayoutShell';
import { apiFetch, requireAuth } from '../../../lib/auth';
// CopyButton moved to event-types page

export const dynamic = 'force-dynamic';

// (removed booking mode and form style helpers — now on event types)

export default async function ResourcesPage({ searchParams }) {
  await requireAuth();

  // (baseUrl removed — share panel moved to event types page)

  const [response, subscriptionRes] = await Promise.all([
    apiFetch('/api/resources'),
    apiFetch('/api/plans/subscription'),
  ]);

  const rows = response.ok ? await response.json() : [];
  const subscription = subscriptionRes.ok ? await subscriptionRes.json() : null;

  const error = searchParams?.error || '';
  const success = searchParams?.success || '';
  // (share panel moved to event types page)

  return (
    <LayoutShell>
      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-4">

        {/* ── Resource list ── */}
        <div className="col-12">
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
                    return (
                      <tr key={row.id}>
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

        {/* Share panel moved to event types page */}

      </div>
    </LayoutShell>
  );
}
