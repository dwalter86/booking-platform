import SuperAdminLayoutShell from '../../../../../components/SuperAdminLayoutShell';
import DataCard from '../../../../../components/DataCard';
import { superAdminFetch, requireSuperAdmin } from '../../../../../lib/superadmin-auth';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function asValue(value, fallback = '') {
  return value === null || value === undefined ? fallback : String(value);
}

export default async function TenantDetailPage({ params, searchParams }) {
  await requireSuperAdmin();

  const { id } = params;
  const response = await superAdminFetch(`/api/superadmin/tenants/${id}`);
  if (!response.ok) {
    return (
      <SuperAdminLayoutShell title="Tenant not found">
        <div className="alert alert-danger">Tenant not found.</div>
        <Link href="/superadmin/tenants" className="btn btn-outline-secondary">Back to tenants</Link>
      </SuperAdminLayoutShell>
    );
  }

  const tenant = await response.json();
  const plansRes = await superAdminFetch('/api/superadmin/plans');
  const plansCatalogue = plansRes.ok ? (await plansRes.json()).plans || [] : [];
  const sub    = tenant.subscription || {};
  const stats  = tenant.stats        || {};

  const success = searchParams?.success || '';
  const error   = searchParams?.error   || '';

  return (
    <SuperAdminLayoutShell title={tenant.display_name || tenant.name}>
      <div className="mb-3">
        <Link href="/superadmin/tenants" className="btn btn-outline-secondary btn-sm">
          ← Back to tenants
        </Link>
      </div>

      {success ? <div className="alert alert-success mb-4">{success}</div> : null}
      {error   ? <div className="alert alert-danger  mb-4">{error}</div>   : null}

      {/* Stats row */}
      <div className="row g-3 mb-4">
        <div className="col-sm-4">
          <div className="card">
            <div className="card-body">
              <div className="subheader">Resources</div>
              <div className="h1 mb-0">{stats.resource_count ?? 0}</div>
            </div>
          </div>
        </div>
        <div className="col-sm-4">
          <div className="card">
            <div className="card-body">
              <div className="subheader">Admin users</div>
              <div className="h1 mb-0">{stats.user_count ?? 0}</div>
            </div>
          </div>
        </div>
        <div className="col-sm-4">
          <div className="card">
            <div className="card-body">
              <div className="subheader">Total bookings</div>
              <div className="h1 mb-0">{stats.booking_count ?? 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile */}
      <DataCard title="Profile">
        <form action="/superadmin-actions/tenants/update" method="post">
          <input type="hidden" name="id" value={tenant.id} />
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Business name</label>
              <input className="form-control" type="text" name="name" defaultValue={asValue(tenant.name)} required />
            </div>
            <div className="col-md-6">
              <label className="form-label">Display name</label>
              <input className="form-control" type="text" name="display_name" defaultValue={asValue(tenant.display_name)} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Contact email</label>
              <input className="form-control" type="email" name="contact_email" defaultValue={asValue(tenant.contact_email)} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Timezone</label>
              <input className="form-control" type="text" name="timezone" defaultValue={asValue(tenant.timezone, 'Europe/London')} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Brand colour</label>
              <input className="form-control" type="text" name="brand_colour" defaultValue={asValue(tenant.brand_colour)} placeholder="#3b82f6" />
            </div>
            <div className="col-md-6">
              <label className="form-label">Logo URL</label>
              <input className="form-control" type="url" name="logo_url" defaultValue={asValue(tenant.logo_url)} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Status</label>
              <select className="form-select" name="status" defaultValue={asValue(tenant.status)}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="col-12">
              <label className="form-label">Booking confirmation message</label>
              <textarea className="form-control" name="booking_confirmation_message" rows="3"
                defaultValue={asValue(tenant.booking_confirmation_message)} />
            </div>
            <div className="col-12">
              <label className="form-check">
                <input className="form-check-input" type="checkbox" name="public_booking_enabled"
                  defaultChecked={tenant.public_booking_enabled} />
                <span className="form-check-label">Public booking enabled</span>
              </label>
            </div>
            <div className="col-12">
              <button className="btn btn-primary" type="submit">Save profile</button>
            </div>
          </div>
        </form>
      </DataCard>

      {/* Subscription */}
      <DataCard title="Subscription">
        <div className="row g-3 mb-3">
          <div className="col-md-3">
            <div className="subheader">Plan</div>
            <div>{sub.plan_name || '—'}</div>
          </div>
          <div className="col-md-3">
            <div className="subheader">Status</div>
            <div>
              <span className={`badge ${
                sub.status === 'active'   ? 'bg-success' :
                sub.status === 'trial'    ? 'bg-info'    :
                sub.status === 'grace'    ? 'bg-warning' :
                sub.status === 'past_due' ? 'bg-danger' :  'bg-secondary'
              }`}>
                {sub.status || '—'}
              </span>
            </div>
          </div>
          <div className="col-md-3">
            <div className="subheader">Period start</div>
            <div>{sub.current_period_start ? new Date(sub.current_period_start).toLocaleDateString('en-GB') : '—'}</div>
          </div>
          <div className="col-md-3">
            <div className="subheader">Period end</div>
            <div>{sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('en-GB') : '—'}</div>
          </div>
        </div>

        <form action="/superadmin-actions/tenants/update-subscription" method="post">
          <input type="hidden" name="id" value={tenant.id} />
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Change plan</label>
              <select className="form-select" name="plan_code" defaultValue={sub.plan_code || ''}>
                <option value="">— no change —</option>
                {plansCatalogue.map(p => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Extend trial by (days)</label>
              <input className="form-control" type="number" name="extend_trial_days" min="1" max="90" placeholder="e.g. 7" />
            </div>
            <div className="col-md-4">
              <label className="form-label">Override status</label>
              <select className="form-select" name="status" defaultValue="">
                <option value="">— no change —</option>
                <option value="trial">Trial</option>
                <option value="grace">Grace period</option>
                <option value="active">Active</option>
                <option value="past_due">Past due</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="col-12">
              <button className="btn btn-primary" type="submit">Update subscription</button>
            </div>
          </div>
        </form>
      </DataCard>

      {/* Admin users */}
      <DataCard title="Admin users">
        <UsersSection tenantId={tenant.id} />
      </DataCard>

    </SuperAdminLayoutShell>
  );
}

async function UsersSection({ tenantId }) {
  const { superAdminFetch } = await import('../../../../../lib/superadmin-auth');
  const response = await superAdminFetch(`/api/superadmin/tenants/${tenantId}/users`);
  const data     = response.ok ? await response.json() : { data: [] };
  const users    = data.data || [];

  return (
    <>
      {users.length ? (
        <div className="table-responsive">
          <table className="table table-vcenter">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last login</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.full_name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>
                    <span className={`badge ${u.is_active ? 'bg-success-lt' : 'bg-secondary-lt'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('en-GB') : 'Never'}</td>
                  <td>
                    <form action="/superadmin-actions/tenants/reset-password" method="post" className="d-flex gap-2">
                      <input type="hidden" name="tenant_id" value={tenantId} />
                      <input type="hidden" name="user_id"   value={u.id} />
                      <input className="form-control form-control-sm" type="text" name="new_password"
                        placeholder="New password" minLength="8" style={{ width: '160px' }} />
                      <button className="btn btn-sm btn-outline-secondary" type="submit">Reset</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mb-0">No users found for this tenant.</p>
      )}
    </>
  );
}
