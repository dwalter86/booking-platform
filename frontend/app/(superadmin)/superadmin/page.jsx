import SuperAdminLayoutShell from '../../../components/SuperAdminLayoutShell';
import DataCard from '../../../components/DataCard';
import { superAdminFetch, requireSuperAdmin } from '../../../lib/superadmin-auth';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SuperAdminDashboardPage() {
  await requireSuperAdmin();

  const response = await superAdminFetch('/api/superadmin/tenants?per_page=100');
  const data     = response.ok ? await response.json() : { data: [], pagination: {} };
  const tenants  = data.data || [];

  // Compute summary stats from tenant list
  const total      = tenants.length;
  const active     = tenants.filter(t => t.subscription_status === 'active').length;
  const trials     = tenants.filter(t => t.subscription_status === 'trial').length;
  const suspended  = tenants.filter(t => t.status === 'suspended').length;

  // Trials expiring within 7 days
  const now        = new Date();
  const in7Days    = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiringSoon = tenants.filter(t => {
    if (t.subscription_status !== 'trial') return false;
    const end = new Date(t.current_period_end);
    return end > now && end <= in7Days;
  });

  return (
    <SuperAdminLayoutShell title="Platform Dashboard">

      {/* Summary stats */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-lg-3">
          <div className="card">
            <div className="card-body">
              <div className="subheader">Total tenants</div>
              <div className="h1 mb-0">{total}</div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-lg-3">
          <div className="card">
            <div className="card-body">
              <div className="subheader">Active (paid)</div>
              <div className="h1 mb-0 text-success">{active}</div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-lg-3">
          <div className="card">
            <div className="card-body">
              <div className="subheader">On trial</div>
              <div className="h1 mb-0 text-info">{trials}</div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-lg-3">
          <div className="card">
            <div className="card-body">
              <div className="subheader">Suspended</div>
              <div className="h1 mb-0 text-danger">{suspended}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Trials expiring soon */}
      {expiringSoon.length > 0 && (
        <DataCard title={`Trials expiring within 7 days (${expiringSoon.length})`}>
          <div className="table-responsive">
            <table className="table table-vcenter">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Subdomain</th>
                  <th>Trial ends</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {expiringSoon.map(t => (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td><span className="text-secondary">{t.subdomain}.availio.co</span></td>
                    <td>{new Date(t.current_period_end).toLocaleDateString('en-GB')}</td>
                    <td>
                      <Link href={`/superadmin/tenants/${t.id}`} className="btn btn-sm btn-outline-primary">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataCard>
      )}

      {/* Recent tenants */}
      <DataCard title="All tenants">
        <div className="mb-3">
          <Link href="/superadmin/tenants/new" className="btn btn-primary">
            Create new tenant
          </Link>
        </div>
        {tenants.length ? (
          <div className="table-responsive">
            <table className="table table-vcenter">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Subdomain</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tenants.map(t => (
                  <tr key={t.id}>
                    <td>{t.display_name || t.name}</td>
                    <td><span className="text-secondary">{t.subdomain}</span></td>
                    <td>{t.plan_name || '—'}</td>
                    <td>
                      <span className={`badge ${
                        t.status === 'active'    ? 'bg-success' :
                        t.status === 'suspended' ? 'bg-danger'  : 'bg-secondary'
                      }`}>
                        {t.status}
                      </span>
                      {t.subscription_status === 'trial' && (
                        <span className="badge bg-info ms-1">trial</span>
                      )}
                    </td>
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
        ) : (
          <p className="mb-0">No tenants yet. <Link href="/superadmin/tenants/new">Create the first one.</Link></p>
        )}
      </DataCard>

    </SuperAdminLayoutShell>
  );
}
