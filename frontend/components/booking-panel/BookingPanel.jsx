'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BookingPanelView from './BookingPanelView';

function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarColor(name) {
  const palette = ['#1e2a78', '#7c3aed', '#dc7a3a', '#1f8a5b', '#2d8cff', '#b83280'];
  if (!name) return palette[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

function pillClass(status) {
  if (status === 'confirmed') return 'status-confirmed';
  if (status === 'cancelled') return 'status-cancelled';
  return 'status-provisional';
}

export default function BookingPanel({ booking, mode = 'view', closeHref, editHref, viewHref }) {
  const router = useRouter();

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && closeHref) router.push(closeHref);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeHref, router]);

  if (!booking) return null;

  const initialsBg = `linear-gradient(135deg, ${avatarColor(booking.customer_name)}, color-mix(in oklch, ${avatarColor(booking.customer_name)} 70%, #000))`;

  return (
    <>
      <div className="bp-backdrop open" onClick={() => closeHref && router.push(closeHref)} />
      <aside className="bp-panel open" role="dialog" aria-modal="true" aria-label="Booking details">
        {/* HEADER */}
        <div className="bp-head">
          <div className="bp-head-top">
            <div className="bp-head-eyebrow">
              {mode === 'edit' ? <>Editing · <b>#{booking.id?.slice(0, 8)}</b></> : <>Booking · <b>#{booking.id?.slice(0, 8)}</b></>}
            </div>
            <div className="bp-head-actions">
              {mode === 'view' && editHref && (
                <a className="bp-iconbtn" title="Edit booking" href={editHref} aria-label="Edit">
                  ✎
                </a>
              )}
              {mode === 'edit' && viewHref && (
                <a className="bp-iconbtn" title="Back to view" href={viewHref} aria-label="View">
                  ←
                </a>
              )}
              {closeHref && (
                <a className="bp-iconbtn" title="Close (Esc)" href={closeHref} aria-label="Close">
                  ✕
                </a>
              )}
            </div>
          </div>

          <div className="bp-hero">
            <div className="bp-av" style={{ background: initialsBg }}>{initials(booking.customer_name)}</div>
            <div style={{ minWidth: 0 }}>
              <h2>{booking.customer_name || '—'}</h2>
              <div className="bp-sub">{booking.customer_email || '—'}</div>
            </div>
          </div>

          <div className="bp-meta-chips">
            <span className={`bp-chip ${pillClass(booking.status)}`}>
              <span className="dot" />
              {booking.status}
            </span>
            {booking.event_type_name && (
              <span className="bp-chip">
                <span className="swatch" style={{ background: booking.event_type_colour || 'var(--av-main)' }} />
                {booking.event_type_name}
              </span>
            )}
          </div>
        </div>

        {/* BODY */}
        <div className="bp-body">
          {mode === 'view' ? (
            <BookingPanelView booking={booking} />
          ) : (
            <div className="bp-section">
              <div className="bp-note-empty">Edit mode coming in next phase.</div>
            </div>
          )}
        </div>

        {/* FOOTER — placeholder; real footer wired in Phase 3 */}
        <div className="bp-foot">
          <div style={{ fontSize: 12, color: 'var(--av-ink-3)' }}>
            Use the buttons in the list to confirm or cancel for now.
          </div>
        </div>
      </aside>
    </>
  );
}
