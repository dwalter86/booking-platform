import SuperAdminLayoutShell from '../../../../components/SuperAdminLayoutShell';
import DataCard from '../../../../components/DataCard';
import { superAdminFetch, requireSuperAdmin } from '../../../../lib/superadmin-auth';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function TenantsPage({ searchParams }) {
  await requireSuperAdmin();

  const status = searchParams?.status || '';
  const search = searchParams?.search || '';
  const page   = searchParams?.page   || '1';

  const params = new URLSearchParams({ page, per_page: '25' });
  if (status) params.set('status', status);
  if (search) params.set('search', search);

  const response = await superAdminFetch(`/api/superadmin/tenants?${params}`);
  const data     = response.ok ? await response.json() : { data: [], pagination: {} };
  const tenants  = data.data        || [];
  const pagination = data.pagination || {};

  const success = searchParams?.success || '';
  const error   = searchParams?.error   || '';

  return (
    <SuperAdminLayoutShell title="Tenants">
      {success ? <div className="alert alert-success mb-4">{success}</div> : null}
      {error   ? <div className="alert alert-danger  mb-4">{error}</div>   : null}

      <DataCard title="Tenants">
        {/* Filters + create button */}
        <div className="d-flex gap-2 mb-4 flex-wrap">
          <Link href="/superadmin/tenants/new" className="btn btn-primary">
            Create tenant
          </Link>
          <form method="get" className="d-flex gap-2 flex-wrap">
            <input
              className="form-control"
              type="search"
              name="search"
              placeholder="Search name or subdomain"
              defaultValue={search}
              style={{ width: '220px' }}
            />
            <select className="form-select" name="status" defaultValue={status} style={{ width: '160px' }}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button className="btn btn-outline-secondary" type="submit">Filter</button>
            {(search || status) && (
              <Link href="/superadmin/tenants" className="btn btn-outline-secondary">Clear</Link>
            )}
          </form>
        </div>

        {tenants.length ? (
          <>
            <div className="table-responsive">
              <table className="table table-vcenter">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Subdomain</th>
                    <th>Plan</th>
                    <th>Subscription</th>
                    <th>Period end</th>
                    <th>Resources</th>
                    <th>Users</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map(t => (
                    <tr key={t.id}>
                      <td>
                        <div>{t.display_name || t.name}</div>
                        <div className="text-secondary small">{t.contact_email || ''}</div>
                      </td>
                      <td><span className="text-secondary">{t.subdomain}</span></td>
                      <td>{t.plan_name || '—'}</td>
                      <td>
                        <span className={`badge ${
                          t.status === 'active'    ? 'bg-success-lt' :
                          t.status === 'suspended' ? 'bg-danger-lt'  : 'bg-secondary-lt'
                        }`}>
                          {t.status}
                        </span>
                        {t.subscription_status === 'trial' && (
                          <span className="badge bg-info-lt ms-1">trial</span>
                        )}
                        {t.subscription_status === 'grace' && (
                          <span className="badge bg-warning-lt ms-1">grace</span>
                        )}
                      </td>
                      <td>
                        {t.current_period_end
                          ? new Date(t.current_period_end).toLocaleDateString('en-GB')
                          : '—'}
                      </td>
                      <td>{t.resource_count}</td>
                      <td>{t.user_count}</td>
                      <td>{new Date(t.created_at).toLocaleDateString('en-GB')}</td>
                      <td>
                        <Link href={`/superadmin/tenants/${t.id}`} className="btn btn-sm btn-outline-secondary">
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="d-flex gap-2 mt-3">
                {pagination.page > 1 && (
                  <Link
                    href={`/superadmin/tenants?page=${pagination.page - 1}&search=${search}&status=${status}`}
                    className="btn btn-outline-secondary btn-sm"
                  >
                    Previous
                  </Link>
                )}
                <span className="text-secondary small align-self-center">
                  Page {pagination.page} of {pagination.total_pages} ({pagination.total} tenants)
                </span>
                {pagination.page < pagination.total_pages && (
                  <Link
                    href={`/superadmin/tenants?page=${pagination.page + 1}&search=${search}&status=${status}`}
                    className="btn btn-outline-secondary btn-sm"
                  >
                    Next
                  </Link>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="mb-0">No tenants found. <Link href="/superadmin/tenants/new">Create the first one.</Link></p>
        )}
      </DataCard>
    </SuperAdminLayoutShell>
  );
}
