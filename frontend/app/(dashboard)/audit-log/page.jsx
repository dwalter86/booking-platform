import LayoutShell from '../../../components/LayoutShell';
import DataCard from '../../../components/DataCard';
import { apiFetch, requireAuth } from '../../../lib/auth';
import { formatDateTime, prettyJson } from '../../../lib/format';

export const dynamic = 'force-dynamic';

export default async function AuditLogPage() {
  await requireAuth();
  const response = await apiFetch('/api/admin/audit-log');
  const rows = response.ok ? await response.json() : [];

  return (
    <LayoutShell title="Audit log">
      <DataCard title="Recent admin actions">
        <div className="table-responsive">
          <table className="table table-striped">
            <thead><tr><th>When</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
            <tbody>
              {Array.isArray(rows) && rows.length ? rows.map((row) => (
                <tr key={row.id}>
                  <td>{formatDateTime(row.created_at)}</td>
                  <td>{row.action}</td>
                  <td>{row.entity_type}</td>
                  <td><pre className="mb-0">{prettyJson(row.details || {})}</pre></td>
                </tr>
              )) : <tr><td colSpan="4">No audit entries found.</td></tr>}
            </tbody>
          </table>
        </div>
      </DataCard>
    </LayoutShell>
  );
}
