'use client';

import { useEffect, useState } from 'react';

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function stripeColour(str) {
  if (!str) return '#1e2a78';
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const palette = ['#1e2a78','#4ea8ff','#1f8a5b','#7c3aed','#dc7a3a','#0e7490','#b45309'];
  return palette[Math.abs(hash) % palette.length];
}

export default function PendingApprovals() {
  const [bookings, setBookings] = useState(null);
  const [acting,   setActing]   = useState({});

  useEffect(() => {
    fetch('/api/bookings/list?status=provisional&per_page=5')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setBookings(d.data || []))
      .catch(() => setBookings([]));
  }, []);

  async function handleAction(bookingId, action) {
    setActing(a => ({ ...a, [bookingId]: action }));
    try {
      const res = await fetch('/api/dashboard/booking-action', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ booking_id: bookingId, action }),
      });
      if (res.ok) {
        setBookings(b => b.filter(x => x.id !== bookingId));
      }
    } finally {
      setActing(a => { const n = { ...a }; delete n[bookingId]; return n; });
    }
  }

  if (bookings === null) return (
      <div style={{
        background: '#fff',
        border: '1px solid var(--av-line)',
        borderRadius: 'var(--av-r-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--av-shadow-sm)',
        height: '100%',
        boxSizing: 'border-box',
      }}>
      <div style={{ fontFamily: 'var(--av-font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--av-ink-3)', marginBottom: 12 }}>Pending approval</div>
      <div style={{ color: 'var(--av-ink-4)', fontSize: 13 }}>Loading…</div>
    </div>
  );

  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--av-line)',
      borderRadius: 'var(--av-r-lg)',
      overflow: 'hidden',
      boxShadow: 'var(--av-shadow-sm)',
    }}>
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--av-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--av-font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--av-ink-3)' }}>
          Pending approval
        </span>
        {bookings.length > 0 && (
          <span style={{ fontFamily: 'var(--av-font-mono)', fontSize: 11, background: 'var(--av-amber-bg)', color: 'var(--av-amber-ink)', padding: '2px 7px', borderRadius: 99, fontWeight: 600 }}>
            {bookings.length}
          </span>
        )}
      </div>

      {bookings.length === 0 ? (
        <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--av-ink-4)', fontSize: 13 }}>
          No pending bookings.
        </div>
      ) : (
        <div>
          {bookings.map(b => {
            const colour  = stripeColour(b.id);
            const date    = new Date(b.start_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
            const time    = new Date(b.start_at).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
            const busy    = acting[b.id];
            return (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--av-line)' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: colour, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                  {initials(b.customer_name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--av-ink)', lineHeight: 1.2 }}>{b.customer_name || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--av-ink-3)', fontFamily: 'var(--av-font-mono)', marginTop: 2 }}>{date} · {time}</div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => handleAction(b.id, 'confirm')}
                    disabled={!!busy}
                    title="Confirm"
                    style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--av-sage-bg)', background: busy === 'confirm' ? 'var(--av-sage-bg)' : '#fff', color: 'var(--av-sage-ink)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  </button>
                  <button
                    onClick={() => handleAction(b.id, 'cancel')}
                    disabled={!!busy}
                    title="Decline"
                    style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--av-line)', background: busy === 'cancel' ? 'var(--av-rose-bg)' : '#fff', color: busy === 'cancel' ? 'var(--av-rose-ink)' : 'var(--av-ink-3)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
          <div style={{ padding: '10px 14px', background: 'var(--av-paper-2)', borderTop: '1px solid var(--av-line)' }}>
            <a href="/bookings?status=provisional" style={{ fontSize: 12, color: 'var(--av-main)', fontWeight: 500, textDecoration: 'none' }}>
              View all pending →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
