import DataCard from '../DataCard';
import { formatDateTime, prettyJson } from '../../lib/format';

export default function AuditLogTabContent({ rows, pagination, page }) {
  return (
    <DataCard title="Recent admin actions">
      <div className="table-responsive">
        <table className="table table-striped">
          <thead><tr><th>When</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
          <tbody>
            {rows.length ? rows.map((row) => (
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
      {pagination && pagination.total_pages > 1 && (
        <div className="card-footer d-flex align-items-center justify-content-between">
          <span className="text-secondary text-sm">
            {pagination.total_count} entries — page {pagination.page} of {pagination.total_pages}
          </span>
          <div className="d-flex gap-2">
            {pagination.page > 1 && (
              <a className="btn btn-sm btn-outline-secondary" href={`/administration?tab=audit-log&page=${pagination.page - 1}`}>Previous</a>
            )}
            {pagination.page < pagination.total_pages && (
              <a className="btn btn-sm btn-outline-secondary" href={`/administration?tab=audit-log&page=${pagination.page + 1}`}>Next</a>
            )}
          </div>
        </div>
      )}
    </DataCard>
  );
}
