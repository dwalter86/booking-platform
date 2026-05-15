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

function CancelForm({ onSubmit, onKeep, saving }) {
  const [reason, setReason] = useState('');
  return (
    <div className="cancel-form">
      <label htmlFor="bp-cancel-reason" style={{ fontSize: 11, color: 'var(--av-ink-3)' }}>
        Reason (optional)
      </label>
      <textarea
        id="bp-cancel-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Why is this being cancelled? The customer will see this."
        rows="3"
      />
      <div className="cf-actions">
        <button type="button" className="btn-soft" onClick={onKeep} disabled={saving}>
          Keep booking
        </button>
        <button
          type="button"
          className="btn-danger"
          onClick={() => onSubmit(reason)}
          disabled={saving}
        >
          {saving ? 'Working…' : 'Cancel anyway'}
        </button>
      </div>
    </div>
  );
}

export default function BookingPanel({
  // Data — either pass `booking` directly, or pass `bookingId` to fetch.
  booking: bookingProp,
  bookingId,
  resources: resourcesProp,
  eventTypes: eventTypesProp,

  // Mode — controlled externally via prop + onModeChange, or via URL hrefs.
  mode = 'view',
  onModeChange,

  // Close — callback (client-state) OR closeHref (URL navigation).
  onClose,
  closeHref,

  // Optional — used only by /bookings page for URL-driven mode + form submission.
  returnParams = '',
  editHref,
  viewHref,
}) {
  const router = useRouter();

  // Booking data: either passed directly (Bookings page) or fetched (Dashboard/Calendar).
  const [fetchedBooking, setFetchedBooking] = useState(null);
  const [fetchError, setFetchError] = useState('');
  const booking = bookingProp || fetchedBooking;

  useEffect(() => {
    if (bookingProp || !bookingId) return;
    let cancelled = false;
    setFetchError('');
    setFetchedBooking(null);
    fetch(`/api/bookings/list/${bookingId}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Failed to load booking');
        return r.json();
      })
      .then((data) => { if (!cancelled) setFetchedBooking(data); })
      .catch((e) => { if (!cancelled) setFetchError(e.message || 'Failed to load booking'); });
    return () => { cancelled = true; };
  }, [bookingId, bookingProp]);

  // Resources + event types: passed in, OR fetched lazily on first edit-mode entry.
  const [fetchedResources, setFetchedResources] = useState(null);
  const [fetchedEventTypes, setFetchedEventTypes] = useState(null);
  const resources = resourcesProp ?? fetchedResources ?? [];
  const eventTypes = eventTypesProp ?? fetchedEventTypes ?? [];

  useEffect(() => {
    if (mode !== 'edit') return;
    if (resourcesProp == null && fetchedResources == null) {
      fetch('/api/resources/list', { cache: 'no-store' })
        .then((r) => r.ok ? r.json() : [])
        .then((d) => setFetchedResources(Array.isArray(d) ? d : []))
        .catch(() => setFetchedResources([]));
    }
    if (eventTypesProp == null && fetchedEventTypes == null) {
      fetch('/api/event-types/list', { cache: 'no-store' })
        .then((r) => r.ok ? r.json() : [])
        .then((d) => setFetchedEventTypes(Array.isArray(d) ? d : []))
        .catch(() => setFetchedEventTypes([]));
    }
  }, [mode, resourcesProp, eventTypesProp, fetchedResources, fetchedEventTypes]);

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

  // Slide-out: flip isOpen to false, wait for the transition,
  // then either call onClose (client mode) or navigate (URL mode).
  const requestClose = (href) => {
    setIsOpen(false);
    setTimeout(() => {
      if (onClose) onClose();
      else if (href) router.push(href);
    }, 320);
  };

  // Cancel-accordion local state (view mode, confirmed bookings)
  const [cancelling, setCancelling] = useState(false);
  useEffect(() => { setCancelling(false); }, [booking?.id, mode]);

  // Action state — used in callback mode for save/confirm/cancel
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Refetch the booking after a successful action.
  const refetchBooking = async (id) => {
    if (!id) return;
    try {
      const r = await fetch(`/api/bookings/list/${id}`, { cache: 'no-store' });
      if (!r.ok) return;
      const data = await r.json();
      setFetchedBooking(data);
    } catch {
      // No-op; refetch failure shouldn't break the panel
    }
  };

  // Save handler — used in callback mode (Dashboard, Calendar)
  const handleSave = async (e) => {
    e.preventDefault();
    if (!booking?.id) return;
    setSaving(true);
    setSaveError('');
    setActionSuccess('');

    // Build payload mirroring booking-actions/update logic
    const payload = {};
    const stringFields = [
      'customer_name', 'customer_email', 'customer_phone',
      'notes', 'event_type_id', 'resource_id', 'meeting_type', 'public_reference',
    ];
    for (const f of stringFields) {
      if (initial[f] === form[f]) continue;
      payload[f] = form[f] === '' && f !== 'customer_name' ? null : form[f];
    }
    if (initial.party_size !== form.party_size) {
      payload.party_size = parseInt(form.party_size, 10) || 1;
    }
    if (initial.start_at !== form.start_at && form.start_at) {
      payload.start_at = new Date(form.start_at).toISOString();
    }
    if (initial.end_at !== form.end_at && form.end_at) {
      payload.end_at = new Date(form.end_at).toISOString();
    }

    if (Object.keys(payload).length === 0) {
      setSaving(false);
      if (onModeChange) onModeChange('view');
      return;
    }

    try {
      const r = await fetch(`/api/bookings/list/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || 'Save failed');
      setFetchedBooking(data);
      setActionSuccess('Booking updated');
      if (onModeChange) onModeChange('view');
    } catch (err) {
      setSaveError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Confirm/cancel handlers — used in callback mode
  const handleConfirm = async () => {
    if (!booking?.id) return;
    setSaving(true);
    setSaveError('');
    setActionSuccess('');
    try {
      const r = await fetch(`/api/bookings/list/${booking.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || 'Confirm failed');
      await refetchBooking(booking.id);
      setActionSuccess('Booking confirmed');
    } catch (err) {
      setSaveError(err.message || 'Confirm failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (reason) => {
    if (!booking?.id) return;
    setSaving(true);
    setSaveError('');
    setActionSuccess('');
    try {
      const r = await fetch(`/api/bookings/list/${booking.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || '' }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || 'Cancel failed');
      await refetchBooking(booking.id);
      setActionSuccess('Booking cancelled');
      setCancelling(false);
    } catch (err) {
      setSaveError(err.message || 'Cancel failed');
    } finally {
      setSaving(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') requestClose(closeHref);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeHref, onClose]);

  // Loading state — fetching the booking
  if (!booking && bookingId && !fetchError) {
    return (
      <aside className={`bp-panel${isOpen ? ' open' : ''}`} role="dialog" aria-label="Loading booking">
        <div className="bp-head">
          <div className="bp-head-top">
            <div className="bp-head-eyebrow">Loading…</div>
            <div className="bp-head-actions">
              <button type="button" className="bp-iconbtn" aria-label="Close" onClick={() => requestClose(closeHref)}>✕</button>
            </div>
          </div>
        </div>
        <div className="bp-body">
          <div className="bp-note-empty">Loading booking details…</div>
        </div>
      </aside>
    );
  }

  // Error state — fetch failed
  if (!booking && fetchError) {
    return (
      <aside className={`bp-panel${isOpen ? ' open' : ''}`} role="dialog" aria-label="Error">
        <div className="bp-head">
          <div className="bp-head-top">
            <div className="bp-head-eyebrow">Error</div>
            <div className="bp-head-actions">
              <button type="button" className="bp-iconbtn" aria-label="Close" onClick={() => requestClose(closeHref)}>✕</button>
            </div>
          </div>
        </div>
        <div className="bp-body">
          <div className="bp-note-card" style={{ background: 'var(--av-rose-bg)', borderColor: 'color-mix(in oklch, var(--av-rose) 25%, white)' }}>
            <div className="bp-nc-head" style={{ color: 'var(--av-rose-ink)' }}>Couldn't load booking</div>
            {fetchError}
          </div>
        </div>
      </aside>
    );
  }

  // No booking provided at all
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
              {mode === 'view' && status !== 'cancelled' && (
                onModeChange ? (
                  <button type="button" className="bp-iconbtn" title="Edit booking" aria-label="Edit" onClick={() => onModeChange('edit')}>✎</button>
                ) : editHref ? (
                  <a className="bp-iconbtn" title="Edit booking" href={editHref} aria-label="Edit">✎</a>
                ) : null
              )}
              {mode === 'edit' && (
                onModeChange ? (
                  <button type="button" className="bp-iconbtn" title="Back to view" aria-label="View" onClick={() => onModeChange('view')}>←</button>
                ) : viewHref ? (
                  <a className="bp-iconbtn" title="Back to view" href={viewHref} aria-label="View">←</a>
                ) : null
              )}
              <button type="button" className="bp-iconbtn" title="Close (Esc)" aria-label="Close" onClick={() => requestClose(closeHref)}>✕</button>
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

        {/* Action feedback (callback mode) */}
        {saveError && (
          <div className="bp-edit-banner" style={{ background: 'var(--av-rose-bg)', color: 'var(--av-rose-ink)' }}>
            <span className="eb-pill" style={{ background: 'var(--av-rose)' }}>Error</span>
            <span>{saveError}</span>
          </div>
        )}
        {actionSuccess && !saveError && (
          <div className="bp-edit-banner" style={{ background: 'var(--av-sage-bg)', color: 'var(--av-sage-ink)' }}>
            <span className="eb-pill" style={{ background: 'var(--av-sage)' }}>Saved</span>
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* BODY */}
        {mode === 'edit' ? (
          <form
            {...(onModeChange
              ? { onSubmit: handleSave }
              : { action: '/booking-actions/update', method: 'post' })}
            style={{ display: 'contents' }}
          >
            {!onModeChange && <input type="hidden" name="booking_id" value={booking.id} />}
            {!onModeChange && returnParams && <input type="hidden" name="return_params" value={returnParams} />}

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
                {onModeChange ? (
                  <button
                    type="button"
                    className="btn-soft"
                    onClick={() => { setForm(initial); onModeChange('view'); }}
                  >
                    Discard
                  </button>
                ) : viewHref ? (
                  <a className="btn-soft" href={viewHref}>Discard</a>
                ) : null}
                <button
                  type="submit"
                  className="btn-brand"
                  disabled={!isDirty || saving}
                >
                  {saving ? 'Saving…' : 'Save changes'}
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
                  {onModeChange ? (
                    <button
                      type="button"
                      className="btn-soft"
                      style={{ marginRight: 'auto' }}
                      onClick={() => handleCancel('')}
                      disabled={saving}
                    >
                      {saving ? 'Working…' : 'Decline'}
                    </button>
                  ) : (
                    <form action="/booking-actions/cancel" method="post" style={{ marginRight: 'auto' }}>
                      <input type="hidden" name="booking_id" value={booking.id} />
                      {returnParams && <input type="hidden" name="return_params" value={returnParams} />}
                      <button type="submit" className="btn-soft">Decline</button>
                    </form>
                  )}
                  <div className="right-actions">
                    {(onModeChange || editHref) && (
                      onModeChange ? (
                        <button type="button" className="btn-soft" onClick={() => onModeChange('edit')}>Edit</button>
                      ) : (
                        <a className="btn-soft" href={editHref}>Edit</a>
                      )
                    )}
                    {onModeChange ? (
                      <button
                        type="button"
                        className="btn-confirm"
                        onClick={handleConfirm}
                        disabled={saving}
                      >
                        {saving ? 'Working…' : 'Confirm booking'}
                      </button>
                    ) : (
                      <form action="/booking-actions/confirm" method="post" style={{ display: 'inline' }}>
                        <input type="hidden" name="booking_id" value={booking.id} />
                        {returnParams && <input type="hidden" name="return_params" value={returnParams} />}
                        <button type="submit" className="btn-confirm">Confirm booking</button>
                      </form>
                    )}
                  </div>
                </>
              )}

              {status === 'confirmed' && (
                <>
                  <div className="danger-zone">
                    <details open={cancelling} onToggle={(e) => setCancelling(e.currentTarget.open)}>
                      <summary>✕ Cancel booking</summary>
                      {cancelling && (
                        onModeChange ? (
                          <CancelForm onSubmit={handleCancel} onKeep={() => setCancelling(false)} saving={saving} />
                        ) : (
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
                        )
                      )}
                    </details>
                  </div>
                  <div className="right-actions">
                    {(onModeChange || editHref) && (
                      onModeChange ? (
                        <button type="button" className="btn-brand" onClick={() => onModeChange('edit')}>✎ Edit</button>
                      ) : (
                        <a className="btn-brand" href={editHref}>✎ Edit</a>
                      )
                    )}
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
