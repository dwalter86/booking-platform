import { formatDateTime } from '../../lib/format';

// Readable labels for the fields that show up in audit detail diffs.
const FIELD_LABELS = {
  customer_name:    'Customer name',
  customer_email:   'Email',
  customer_phone:   'Phone',
  start_at:         'Start',
  end_at:           'End',
  party_size:       'Party size',
  resource_id:      'Resource',
  event_type_id:    'Event type',
  meeting_type:     'Meeting type',
  public_reference: 'Reference',
  notes:            'Notes',
  status:           'Status',
  name:             'Name',
  display_name:     'Display name',
  full_name:        'Full name',
  contact_email:    'Contact email',
  timezone:         'Timezone',
  role:             'Role',
  is_active:        'Active',
};

function fieldLabel(key) {
  return FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

function fmtVal(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDateTime(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// Turn an audit row's `details` JSON into a human-readable shape.
// Update actions arrive as { updated: {newValues}, previous: {snapshot} } —
// we show only the fields that actually changed, as before → after.
// Create/delete (or anything else) degrade to a tidy key/value list.
function describe(details) {
  if (!details || typeof details !== 'object') return { type: 'empty' };

  if (details.updated && typeof details.updated === 'object') {
    const prev = details.previous && typeof details.previous === 'object' ? details.previous : {};
    const changes = [];
    for (const key of Object.keys(details.updated)) {
      const to = details.updated[key];
      const from = prev[key];
      if (JSON.stringify(from) !== JSON.stringify(to)) {
        changes.push({ field: fieldLabel(key), from: fmtVal(from), to: fmtVal(to) });
      }
    }
    return { type: 'diff', changes };
  }

  const snapshot = details.created || details.deleted || details;
  const entries = snapshot && typeof snapshot === 'object'
    ? Object.entries(snapshot).map(([k, v]) => [fieldLabel(k), fmtVal(v)])
    : [];
  return { type: 'list', entries };
}

const ACTION_PILL = {
  created:   'active',
  updated:   'pending',
  deleted:   'full',
  cancelled: 'inactive',
  confirmed: 'active',
};

function DetailsCell({ details }) {
  const d = describe(details);

  if (d.type === 'diff') {
    if (!d.changes.length) return <span className="av-muted">No field changes</span>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {d.changes.map((c, i) => (
          <div key={i} style={{ fontSize: 13, lineHeight: 1.35 }}>
            <span style={{ color: 'var(--av-ink-3)' }}>{c.field}: </span>
            <span style={{ color: 'var(--av-ink-3)', textDecoration: 'line-through' }}>{c.from}</span>
            <span style={{ color: 'var(--av-ink-4)' }}> → </span>
            <span style={{ color: 'var(--av-ink)', fontWeight: 500 }}>{c.to}</span>
          </div>
        ))}
      </div>
    );
  }

  if (d.type === 'list' && d.entries.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {d.entries.map(([label, val], i) => (
          <div key={i} style={{ fontSize: 13, lineHeight: 1.35 }}>
            <span style={{ color: 'var(--av-ink-3)' }}>{label}: </span>
            <span style={{ color: 'var(--av-ink)' }}>{val}</span>
          </div>
        ))}
      </div>
    );
  }

  return <span className="av-muted">—</span>;
}

export default function AuditLogTabContent({ rows, pagination, page }) {
  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--av-ink)' }}>
          Recent admin actions
        </h3>
      </div>

      <div className="av-list">
        <div className="av-list-row av-list-head cols-audit">
          <div>When</div>
          <div>Action</div>
          <div>Entity</div>
          <div>Details</div>
        </div>

        {rows.length ? rows.map((row) => (
          <div key={row.id} className="av-list-row cols-audit" style={{ alignItems: 'flex-start' }}>
            <div className="av-cell-meta">{formatDateTime(row.created_at)}</div>
            <div>
              <span className={`av-pill ${ACTION_PILL[row.action] || 'inactive'}`}>
                <span className="av-dot" />
                {row.action ? row.action.charAt(0).toUpperCase() + row.action.slice(1) : '—'}
              </span>
            </div>
            <div className="av-cell-meta" style={{ textTransform: 'capitalize' }}>
              {row.entity_type ? row.entity_type.replace(/_/g, ' ') : '—'}
            </div>
            <DetailsCell details={row.details || {}} />
          </div>
        )) : (
          <div className="av-list-row" style={{ display: 'block' }}>
            <span className="av-muted">No audit entries found.</span>
          </div>
        )}

        {pagination && pagination.total_pages > 1 && (
          <div className="av-list-foot">
            <span>
              {pagination.total_count} entries — page {pagination.page} of {pagination.total_pages}
            </span>
            <div className="av-pager">
              {pagination.page > 1 ? (
                <a href={`/administration?tab=audit-log&page=${pagination.page - 1}`}>Prev</a>
              ) : (
                <span className="av-pager-btn disabled">Prev</span>
              )}
              {pagination.page < pagination.total_pages ? (
                <a href={`/administration?tab=audit-log&page=${pagination.page + 1}`}>Next</a>
              ) : (
                <span className="av-pager-btn disabled">Next</span>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
