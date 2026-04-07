import LayoutShell from '../../../components/LayoutShell';
import DataCard from '../../../components/DataCard';
import { apiFetch, requireAuth } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage({ searchParams }) {
  await requireAuth();
  const response = await apiFetch('/api/admin/users');
  const rows = response.ok ? await response.json() : [];
  const error = searchParams?.error || '';
  const success = searchParams?.success || '';
  const editUserId = searchParams?.edit || '';
  const editUser = Array.isArray(rows) ? rows.find((r) => r.id === editUserId) || null : null;

  return (
    <LayoutShell title="Admin users">
      {success ? <div className="alert alert-success">{success}</div> : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}

      <DataCard title="Invite admin user">
        <form action="/api/admin/users/create" method="post">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Full name</label>
              <input className="form-control" type="text" name="full_name" required />
            </div>
            <div className="col-md-4">
              <label className="form-label">Email</label>
              <input className="form-control" type="email" name="email" required />
            </div>
            <div className="col-md-4">
              <label className="form-label">Password</label>
              <input className="form-control" type="password" name="password" required minLength={8} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Role</label>
              <select className="form-select" name="role">
                <option value="admin">Admin</option>
                <option value="superadmin">Super admin</option>
              </select>
            </div>
            <div className="col-12">
              <button className="btn btn-primary" type="submit">Create user</button>
            </div>
          </div>
        </form>
      </DataCard>

      {editUser && (
        <DataCard title={`Edit user — ${editUser.full_name || editUser.email}`}>
          <form action="/api/admin/users/update" method="post">
            <input type="hidden" name="user_id" value={editUser.id} />
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Full name</label>
                <input className="form-control" type="text" name="full_name" defaultValue={editUser.full_name || ''} required />
              </div>
              <div className="col-md-4">
                <label className="form-label">Role</label>
                <select className="form-select" name="role" defaultValue={editUser.role || 'admin'}>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super admin</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Active</label>
                <select className="form-select" name="is_active" defaultValue={editUser.is_active ? 'true' : 'false'}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="col-12 d-flex gap-2">
                <button className="btn btn-primary" type="submit">Save changes</button>
                <a className="btn btn-outline-secondary" href="/admin-users">Cancel</a>
              </div>
            </div>
          </form>
        </DataCard>
      )}

      <DataCard title="Tenant admin users">
        <div className="table-responsive">
          <table className="table table-striped">
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
              {Array.isArray(rows) && rows.length ? rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.full_name || '—'}</td>
                  <td>{row.email}</td>
                  <td>{row.role || 'admin'}</td>
                  <td>
                    {row.is_active
                      ? <span className="badge bg-green-lt">Active</span>
                      : <span className="badge bg-red-lt">Inactive</span>}
                  </td>
                  <td>{row.last_login_at ? new Date(row.last_login_at).toLocaleString() : '—'}</td>
                  <td>
                    <a className="btn btn-sm btn-outline-primary" href={`/admin-users?edit=${row.id}`}>Edit</a>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="6">No admin users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </DataCard>
    </LayoutShell>
  );
}
