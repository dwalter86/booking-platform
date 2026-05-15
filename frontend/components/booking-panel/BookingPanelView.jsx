'use client';

import Ring from './Ring';

function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarColor(name) {
  // Deterministic colour from name, so the same customer always renders the same hue.
  const palette = ['#1e2a78', '#7c3aed', '#dc7a3a', '#1f8a5b', '#2d8cff', '#b83280'];
  if (!name) return palette[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

function formatLong(iso) {
  if (!iso) return { date: '—', day: '', time: '' };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: '—', day: '', time: '' };
  return {
    date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    day: d.toLocaleDateString('en-GB', { weekday: 'long' }),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  };
}

function durationLabel(startIso, endIso) {
  if (!startIso || !endIso) return '—';
  const mins = Math.round((new Date(endIso) - new Date(startIso)) / 60000);
  if (mins <= 0) return '—';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function formatActivityTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// Derive a minimal activity list from existing timestamps.
// TODO: replace with real audit_log integration in a follow-up phase.
function deriveActivity(b) {
  const items = [];
  if (b.cancelled_at) {
    items.push({
      kind: 'cancelled',
      body: b.cancellation_reason ? `Cancelled · reason: ${b.cancellation_reason}` : 'Booking cancelled',
      time: formatActivityTime(b.cancelled_at),
    });
  }
  if (b.confirmed_at) {
    items.push({
      kind: 'confirmed',
      body: 'Booking confirmed',
      time: formatActivityTime(b.confirmed_at),
    });
  }
  if (b.created_at) {
    items.push({
      kind: 'created',
      body: b.source === 'public' ? 'Created via public booking page' : 'Created via admin',
      time: formatActivityTime(b.created_at),
    });
  }
  return items;
}

export default function BookingPanelView({ booking: b }) {
  const start = formatLong(b.start_at);
  const end = formatLong(b.end_at);
  const duration = durationLabel(b.start_at, b.end_at);
  const initialsBg = `linear-gradient(135deg, ${avatarColor(b.customer_name)}, color-mix(in oklch, ${avatarColor(b.customer_name)} 70%, #000))`;
  const activity = deriveActivity(b);

  // Resource load placeholder. TODO: real query in follow-up.
  const resourceLoad = 0;

  return (
    <>
      {/* Customer */}
      <div className="bp-section">
        <div className="bp-section-head">
          <h4>Customer</h4>
        </div>
        <div className="bp-cust">
          <div className="bp-av-lg" style={{ background: initialsBg }}>{initials(b.customer_name)}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3>{b.customer_name || '—'}</h3>
            <div className="bp-c-sub">
              <span style={{ fontFamily: 'var(--av-font-mono)' }}>{b.customer_email || '—'}</span>
            </div>
            <div className="bp-c-chips">
              {b.customer_phone
                ? <span className="bp-c-chip">{b.customer_phone}</span>
                : <span className="bp-c-chip" style={{ color: 'var(--av-ink-4)' }}>no phone on file</span>}
              <span className="bp-c-chip">Party of {b.party_size || 1}</span>
            </div>
          </div>
        </div>
      </div>

      {/* When */}
      <div className="bp-section">
        <div className="bp-section-head">
          <h4>When</h4>
        </div>
        <div className="bp-when-row">
          <div className="bp-when-block">
            <span className="bp-wb-label">Start</span>
            <span className="bp-wb-date">{start.date}</span>
            <span className="bp-wb-day">{start.day} · {start.time}</span>
          </div>
          <div className="bp-when-arrow">
            <span className="duration">{duration}</span>
            <span aria-hidden>→</span>
          </div>
          <div className="bp-when-block">
            <span className="bp-wb-label">End</span>
            <span className="bp-wb-date">{end.date}</span>
            <span className="bp-wb-day">{end.day} · {end.time}</span>
          </div>
        </div>
      </div>

      {/* Resource & location */}
      <div className="bp-section">
        <div className="bp-section-head">
          <h4>Resource &amp; location</h4>
        </div>
        <div className="bp-res-card">
          <Ring value={resourceLoad} size={48} stroke={5}>
            <span style={{ fontSize: 11, fontWeight: 700 }}>—</span>
          </Ring>
          <div style={{ minWidth: 0 }}>
            <div className="bp-rc-name">{b.resource_name || 'Unknown resource'}</div>
            <div className="bp-rc-sub">Capacity &amp; load — coming soon</div>
          </div>
        </div>
        <div className="bp-loc-row">
          <div className="bp-loc-ico">
            {b.meeting_type === 'online' ? 'O' : b.meeting_type === 'telephone' ? 'T' : 'P'}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="bp-loc-name">
              {b.meeting_type === 'online' ? 'Online meeting'
                : b.meeting_type === 'telephone' ? 'Telephone'
                : b.meeting_type === 'in_person' ? 'In person'
                : 'Location not set'}
            </div>
            <div className="bp-loc-addr">
              {b.meeting_type === 'telephone' && b.booker_phone
                ? b.booker_phone
                : 'Details provided on confirmation — locations feature coming soon'}
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="bp-section">
        <div className="bp-section-head"><h4>Details</h4></div>
        <dl className="bp-attrs">
          <dt>Event type</dt>
          <dd>
            {b.event_type_name ? (
              <>
                <span
                  style={{
                    display: 'inline-block', width: 10, height: 10, borderRadius: 3,
                    background: b.event_type_colour || 'var(--av-main)',
                    marginRight: 6, verticalAlign: 'middle',
                  }}
                />
                {b.event_type_name}
              </>
            ) : <span className="empty">—</span>}
          </dd>
          <dt>Source</dt>
          <dd>{b.source || '—'}</dd>
          <dt>Reference</dt>
          <dd className={b.reference_code ? '' : 'empty'}>{b.reference_code || '—'}</dd>
          <dt>Booking ID</dt>
          <dd style={{ fontFamily: 'var(--av-font-mono)', fontSize: 12.5, fontWeight: 600 }}>#{b.id?.slice(0, 8)}</dd>
        </dl>
      </div>

      {/* Customer notes */}
      <div className="bp-section">
        <div className="bp-section-head"><h4>Notes from customer</h4></div>
        {b.notes
          ? <div className="bp-note-card"><div className="bp-nc-head">Customer note</div>{b.notes}</div>
          : <div className="bp-note-empty">No notes left by the customer.</div>}
      </div>

      {/* Cancellation reason (only when cancelled) */}
      {b.status === 'cancelled' && b.cancellation_reason && (
        <div className="bp-section">
          <div className="bp-section-head"><h4>Cancellation reason</h4></div>
          <div className="bp-note-card" style={{ background: 'var(--av-rose-bg)', borderColor: 'color-mix(in oklch, var(--av-rose) 25%, white)' }}>
            <div className="bp-nc-head" style={{ color: 'var(--av-rose-ink)' }}>Cancelled</div>
            {b.cancellation_reason}
          </div>
        </div>
      )}

      {/* Activity */}
      <div className="bp-section">
        <div className="bp-section-head"><h4>Activity</h4></div>
        <div className="bp-activity">
          {activity.length === 0 ? (
            <div className="bp-note-empty">No activity yet.</div>
          ) : activity.map((h, i) => (
            <div key={i} className={`bp-act-row ${h.kind}`}>
              <div className="bp-act-dot" />
              <div>{h.body}</div>
              <div className="bp-act-time">{h.time}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
