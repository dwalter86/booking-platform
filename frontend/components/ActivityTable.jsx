'use client';

import { useState, useMemo } from 'react';
import { formatDateTime } from '../lib/format';

// Deterministic colour from a string (used until Phase 4 adds a colour column)
function stripeColour(str) {
  if (!str) return '#1e2a78';
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const palette = ['#1e2a78','#4ea8ff','#1f8a5b','#7c3aed','#dc7a3a','#0e7490','#b45309'];
  return palette[Math.abs(hash) % palette.length];
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function StatusPill({ status }) {
  return (
    <span className={`av-pill ${status}`}>
      <span className="av-dot" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

const TABS = [['all', 'All'], ['confirmed', 'Confirmed'], ['provisional', 'Pending'], ['cancelled', 'Cancelled']];

export default function ActivityTable({ initialBookings = [], totalCount = 0 }) {
  const [tab, setTab] = useState('all');

  const filtered = useMemo(() => {
    if (tab === 'all') return initialBookings;
    return initialBookings.filter(b => b.status === tab);
  }, [tab, initialBookings]);

  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--av-line)',
      borderRadius: 'var(--av-r-lg)',
      overflow: 'hidden',
      boxShadow: 'var(--av-shadow-sm)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 20px',
        borderBottom: '1px solid var(--av-line)',
        flexWrap: 'wrap', rowGap: 8,
      }}>
        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--av-ink)', letterSpacing: '-.01em' }}>
          Recent bookings
        </span>

        {/* Tabs */}
        <div style={{
          display: 'inline-flex', background: 'var(--av-paper-2)',
          border: '1px solid var(--av-line)', borderRadius: 9, padding: 2, marginLeft: 4,
        }}>
          {TABS.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '5px 11px', borderRadius: 7, fontSize: 12, fontWeight: 500,
              border: 'none', cursor: 'pointer', transition: 'background .15s',
              background: tab === key ? '#fff' : 'transparent',
              color: tab === key ? 'var(--av-ink)' : 'var(--av-ink-3)',
              boxShadow: tab === key ? 'var(--av-shadow-sm)' : 'none',
            }}>
              {label}
            </button>
          ))}
        </div>

        <a href="/bookings" style={{
          marginLeft: 'auto', fontSize: 12.5, color: 'var(--av-main)',
          fontWeight: 500, textDecoration: 'none',
        }}>
          View all bookings →
        </a>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--av-paper-2)' }}>
              {['Customer', 'Event type', 'Status', 'Start', 'End', ''].map(h => (
                <th key={h} style={{
                  padding: '8px 16px', textAlign: 'left',
                  fontSize: 11, fontWeight: 500, color: 'var(--av-ink-3)',
                  borderBottom: '1px solid var(--av-line)',
                  whiteSpace: 'nowrap',
                  fontFamily: 'var(--av-font-mono)',
                  textTransform: 'uppercase', letterSpacing: '.1em',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--av-ink-3)', fontSize: 13 }}>
                  No bookings found.
                </td>
              </tr>
            ) : filtered.map(row => {
              const colour = stripeColour(row.event_type_id || row.resource_id);
              return (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--av-line)', transition: 'background .12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--av-paper-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>

                  {/* Customer */}
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: colour, color: '#fff',
                        display: 'grid', placeItems: 'center',
                        fontSize: 11, fontWeight: 600, flexShrink: 0,
                      }}>
                        {initials(row.customer_name)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 500, color: 'var(--av-ink)', lineHeight: 1.2 }}>
                          {row.customer_name || <span style={{ color: 'var(--av-ink-4)' }}>—</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--av-ink-3)', fontFamily: 'var(--av-font-mono)' }}>
                          {row.customer_email || ''}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Event type */}
                  <td style={{ padding: '10px 16px', color: 'var(--av-ink-2)' }}>
                    {row.event_type_name || row.resource_name || <span style={{ color: 'var(--av-ink-4)' }}>—</span>}
                    <div style={{ fontSize: 11, color: 'var(--av-ink-3)', fontFamily: 'var(--av-font-mono)', marginTop: 2 }}>
                      {formatDateTime(row.created_at)}
                    </div>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '10px 16px' }}>
                    <StatusPill status={row.status} />
                  </td>

                  {/* Start */}
                  <td style={{ padding: '10px 16px', color: 'var(--av-ink-2)', whiteSpace: 'nowrap' }}>
                    {formatDateTime(row.start_at)}
                  </td>

                  {/* End */}
                  <td style={{ padding: '10px 16px', color: 'var(--av-ink-2)', whiteSpace: 'nowrap' }}>
                    {formatDateTime(row.end_at)}
                  </td>

                  {/* Action */}
                  <td style={{ padding: '10px 16px' }}>
                    <a href={`/bookings?booking_id=${row.id}`} style={{
                      fontSize: 12, color: 'var(--av-ink-3)', textDecoration: 'none',
                      padding: '4px 9px', borderRadius: 6,
                      border: '1px solid var(--av-line)', background: '#fff',
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                    }}>
                      View
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 20px', background: 'var(--av-paper-2)',
        borderTop: '1px solid var(--av-line)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <a href="/bookings" style={{ fontSize: 12.5, color: 'var(--av-main)', fontWeight: 500, textDecoration: 'none' }}>
          View all bookings →
        </a>
        <span style={{ fontFamily: 'var(--av-font-mono)', fontSize: 11, color: 'var(--av-ink-3)' }}>
          {filtered.length} shown · {totalCount} total
        </span>
      </div>
    </div>
  );
}
