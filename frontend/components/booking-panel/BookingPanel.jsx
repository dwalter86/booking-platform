'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import BookingPanelView from './BookingPanelView';
import BookingPanelEdit from './BookingPanelEdit';

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

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildInitialForm(b) {
  return {
    customer_name:    b.customer_name || '',
    customer_email:   b.customer_email || '',
    customer_phone:   b.customer_phone || '',
    party_size:       b.party_size || 1,
    resource_id:      b.resource_id || '',
    event_type_id:    b.event_type_id || '',
    start_at:         toLocalInput(b.start_at),
    end_at:           toLocalInput(b.end_at),
    meeting_type:     b.meeting_type || '',
    public_reference: b.reference_code || '',
    notes:            b.notes || '',
  };
}

export default function BookingPanel({
  booking,
  resources = [],
  eventTypes = [],
  mode = 'view',
  returnParams = '',
  closeHref,
  editHref,
  viewHref,
}) {
  const router = useRouter();

  // Initial form snapshot — rebuilds when the booking changes.
  const initial = useMemo(() => buildInitialForm(booking || {}), [booking?.id]);
  const [form, setForm] = useState(initial);
  useEffect(() => { setForm(initial); }, [initial]);

  const setF = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const isDirty = useMemo(() => {
    return Object.keys(initial).some((k) => String(initial[k] ?? '') !== String(form[k] ?? ''));
  }, [form, initial]);

  // Slide-in animation: render closed on mount, flip to open on next paint
  // so the browser actually sees the transition.
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setIsOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Slide-out: flip isOpen to false, wait for the transition, then navigate.
  // Duration must match the .32s in .bp-panel's CSS transition.
  const requestClose = (href) => {
    if (!href) return;
    setIsOpen(false);
    setTimeout(() => router.push(href), 320);
  };

  // Cancel-accordion local state (view mode, confirmed bookings)
  const [cancelling, setCancelling] = useState(false);
  useEffect(() => { setCancelling(false); }, [booking?.id, mode]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') requestClose(closeHref);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeHref]);

  if (!booking) return null;

  const initialsBg = `linear-gradient(135deg, ${avatarColor(booking.customer_name)}, color-mix(in oklch, ${avatarColor(booking.customer_name)} 70%, #000))`;
  const status = booking.status;

  return (
    <>
      <div className={`bp-backdrop${isOpen ? ' open' : ''}`} onClick={() => requestClose(closeHref)} />
      <aside className={`bp-panel${isOpen ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label="Booking details">
        {/* HEADER */}
        <div className="bp-head">
          <div className="bp-head-top">
            <div className="bp-head-eyebrow">
              {mode === 'edit'
                ? <>Editing · <b>#{booking.id?.slice(0, 8)}</b>{isDirty && <span className="bp-dirty-dot" title="Unsaved changes" />}</>
                : <>Booking · <b>#{booking.id?.slice(0, 8)}</b></>}
            </div>
            <div className="bp-head-actions">
              {mode === 'view' && editHref && status !== 'cancelled' && (
                <a className="bp-iconbtn" title="Edit booking" href={editHref} aria-label="Edit">✎</a>
              )}
              {mode === 'edit' && viewHref && (
                <a className="bp-iconbtn" title="Back to view" href={viewHref} aria-label="View">←</a>
              )}
              {closeHref && (
                <button type="button" className="bp-iconbtn" title="Close (Esc)" aria-label="Close" onClick={() => requestClose(closeHref)}>✕</button>
              )}
            </div>
          </div>

          <div className="bp-hero">
            <div className="bp-av" style={{ background: initialsBg }}>{initials(booking.customer_name)}</div>
            <div style={{ minWidth: 0 }}>
              <h2>{mode === 'edit' ? (form.customer_name || '—') : (booking.customer_name || '—')}</h2>
              <div className="bp-sub">{mode === 'edit' ? (form.customer_email || booking.customer_email || '—') : (booking.customer_email || '—')}</div>
            </div>
          </div>

          <div className="bp-meta-chips">
            <span className={`bp-chip ${pillClass(status)}`}>
              <span className="dot" />
              {status}
            </span>
            {booking.event_type_name && (
              <span className="bp-chip">
                <span className="swatch" style={{ background: booking.event_type_colour || 'var(--av-main)' }} />
                {booking.event_type_name}
              </span>
            )}
          </div>
        </div>

        {/* EDIT BANNER */}
        {mode === 'edit' && (
          <div className="bp-edit-banner">
            <span className="eb-pill">Edit mode</span>
            <span>Changes are not saved until you click <b>Save changes</b>.</span>
          </div>
        )}

        {/* BODY */}
        {mode === 'edit' ? (
          <form action="/booking-actions/update" method="post" style={{ display: 'contents' }}>
            <input type="hidden" name="booking_id" value={booking.id} />
            {returnParams && <input type="hidden" name="return_params" value={returnParams} />}

            <div className="bp-body">
              <BookingPanelEdit
                booking={booking}
                form={form}
                setF={setF}
                resources={resources}
                eventTypes={eventTypes}
              />
            </div>

            {/* FOOTER — edit mode */}
            <div className="bp-foot">
              <div className="danger-zone">
                {isDirty
                  ? <span><span className="bp-dirty-dot" /> Unsaved changes</span>
                  : <span>No changes yet</span>}
              </div>
              <div className="right-actions">
                {viewHref && (
                  <a className="btn-soft" href={viewHref}>Discard</a>
                )}
                <button
                  type="submit"
                  className="btn-brand"
                  disabled={!isDirty}
                >
                  Save changes
                </button>
              </div>
            </div>
          </form>
        ) : (
          <>
            <div className="bp-body">
              <BookingPanelView booking={booking} />
            </div>

            {/* FOOTER — view mode, status-aware */}
            <div className="bp-foot">
              {status === 'provisional' && (
                <>
                  <form action="/booking-actions/cancel" method="post" style={{ marginRight: 'auto' }}>
                    <input type="hidden" name="booking_id" value={booking.id} />
                    {returnParams && <input type="hidden" name="return_params" value={returnParams} />}
                    <button type="submit" className="btn-soft">Decline</button>
                  </form>
                  <div className="right-actions">
                    {editHref && <a className="btn-soft" href={editHref}>Edit</a>}
                    <form action="/booking-actions/confirm" method="post" style={{ display: 'inline' }}>
                      <input type="hidden" name="booking_id" value={booking.id} />
                      {returnParams && <input type="hidden" name="return_params" value={returnParams} />}
                      <button type="submit" className="btn-confirm">Confirm booking</button>
                    </form>
                  </div>
                </>
              )}

              {status === 'confirmed' && (
                <>
                  <div className="danger-zone">
                    <details open={cancelling} onToggle={(e) => setCancelling(e.currentTarget.open)}>
                      <summary>✕ Cancel booking</summary>
                      {cancelling && (
                        <form action="/booking-actions/cancel" method="post" className="cancel-form">
                          <input type="hidden" name="booking_id" value={booking.id} />
                          {returnParams && <input type="hidden" name="return_params" value={returnParams} />}
                          <label htmlFor="bp-cancel-reason" style={{ fontSize: 11, color: 'var(--av-ink-3)' }}>
                            Reason (optional)
                          </label>
                          <textarea
                            id="bp-cancel-reason"
                            name="reason"
                            placeholder="Why is this being cancelled? The customer will see this."
                            rows="3"
                          />
                          <div className="cf-actions">
                            <button type="button" className="btn-soft" onClick={() => setCancelling(false)}>
                              Keep booking
                            </button>
                            <button type="submit" className="btn-danger">Cancel anyway</button>
                          </div>
                        </form>
                      )}
                    </details>
                  </div>
                  <div className="right-actions">
                    {editHref && <a className="btn-brand" href={editHref}>✎ Edit</a>}
                  </div>
                </>
              )}

              {status === 'cancelled' && (
                <>
                  <div className="danger-zone" style={{ color: 'var(--av-ink-3)' }}>
                    This booking was cancelled. It is read-only.
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
