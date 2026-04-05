import LayoutShell from '../../../components/LayoutShell';
import DataCard from '../../../components/DataCard';
import { apiFetch, requireAuth } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  await requireAuth();
  const response = await apiFetch('/api/admin/users');
  const rows = response.ok ? await response.json() : [];

  return (
    <LayoutShell title="Admin users">
      <DataCard title="Tenant admin users">
        <div className="table-responsive">
          <table className="table table-striped">
            <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Role</th></tr></thead>
            <tbody>
              {Array.isArray(rows) && rows.length ? rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.full_name || row.name || '—'}</td>
                  <td>{row.email}</td>
                  <td>{row.status || 'active'}</td>
                  <td>{row.role || 'admin'}</td>
                </tr>
              )) : <tr><td colSpan="4">No admin users found.</td></tr>}
            </tbody>
          </table>
        </div>
      </DataCard>
    </LayoutShell>
  );
}
