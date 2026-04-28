'use client';

/**
 * BookingFormSplit — split panel 50/50: calendar left, form right. Tabler styled.
 * Calendar panel matches Classic form styling exactly.
 */

import { useEffect, useMemo, useState } from 'react';

function localDateStr(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function fmtShort(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
function fmtTime(iso) { return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
function fmtDuration(h) {
  if (!h) return '';
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return hh === 0 ? `${mm}m` : mm === 0 ? `${hh}h` : `${hh}h ${mm}m`;
}
function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDayOfMonth(y, m) { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; }

// ── Calendar panel — matches Classic styling exactly ──────────────────────────

function CalendarPanel({
  resources, resourceId, onResourceChange,
  selectedDate, onSelectDate,
  closedDates, fullDates, hasRules, calLoading,
  slots, slotsLoading, slotsError,
  selectedSlot, onSelectSlot,
  bookingMode, freeStart, freeEnd,
  onFreeStartChange, onFreeEndChange,
  durationWarning, maxHours,
}) {
  const today = localDateStr(new Date());
  const now = new Date();
  const [vy, setVy] = useState(now.getFullYear());
  const [vm, setVm] = useState(now.getMonth());

  const dim = getDaysInMonth(vy, vm);
  const first = getFirstDayOfMonth(vy, vm);
  const monthLabel = new Date(vy, vm, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const cells = [...Array(first).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];

  const slotsForDay = slots.filter(s => s.start_at?.startsWith(selectedDate || ''));
  const availSlots = slotsForDay.filter(s => !s.blocked && s.is_available && new Date(s.start_at) >= new Date());

  return (
    <div style={{ flex: '0 0 50%', borderRight: '1px solid var(--tblr-border-color, #dee2e6)', display: 'flex', flexDirection: 'column' }}>
      <div className="card-body" style={{ flex: 1 }}>

        {/* Resource selector — only shown when multiple resources */}
        {resources.length > 1 && (
          <div className="mb-3">
            <label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#868e96' }}>Resource</label>
            <select className="form-select" value={resourceId} onChange={e => onResourceChange(e.target.value)}>
              {resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        )}

        {/* Month navigation — identical to Classic */}
        <div className="d-flex justify-content-between align-items-center mb-2">
          <button type="button" className="btn btn-sm btn-outline-secondary"
            onClick={() => vm === 0 ? (setVm(11), setVy(y => y - 1)) : setVm(m => m - 1)}>&larr;</button>
          <span style={{ fontWeight: 500, fontSize: 13 }}>{monthLabel}</span>
          <button type="button" className="btn btn-sm btn-outline-secondary"
            onClick={() => vm === 11 ? (setVm(0), setVy(y => y + 1)) : setVm(m => m + 1)}>&rarr;</button>
        </div>

        {/* Calendar grid — identical styling to Classic */}
        {calLoading ? (
          <div className="text-muted" style={{ fontSize: 13 }}>Loading availability…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, textAlign: 'center' }}>
            {['M','T','W','T','F','S','S'].map((d, i) => (
              <div key={i} style={{ fontSize: 11, fontWeight: 500, color: '#868e96', padding: '3px 0' }}>{d}</div>
            ))}
            {cells.map((d, i) => {
              if (!d) return <div key={`e${i}`} />;
              const str = `${vy}-${String(vm+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
              const isPast = str < today;
              const isClosed = closedDates.has(str) || fullDates.has(str);
              const isSelected = str === selectedDate;
              const canSelect = !isPast && !isClosed;

              // Exactly the same styling logic as Classic / MiniCalendar
              let bg = 'transparent', color = '#212529', textDecoration = 'none', cursor = 'pointer';
              if (isSelected) { bg = '#206bc4'; color = '#fff'; }
              else if (isClosed) { bg = '#f9f9f7'; color = '#bbb'; textDecoration = 'line-through'; cursor = 'not-allowed'; }
              else if (isPast) { color = '#ccc'; cursor = 'not-allowed'; }
              else if (hasRules) { bg = '#d3f9d8'; color = '#1a7a2e'; }

              return (
                <div key={str} onClick={() => canSelect && onSelectDate(str)}
                  style={{
                    padding: '5px 2px', fontSize: 12,
                    borderRadius: 4,  // rectangle with slight rounding — same as Classic
                    background: bg, color, textDecoration, cursor,
                    lineHeight: 1.3, userSelect: 'none',
                  }}
                  title={isClosed ? 'Closed' : ''}>
                  {d}
                </div>
              );
            })}
          </div>
        )}

        {/* Legend — same as Classic */}
        <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
          {hasRules && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#666' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#d3f9d8', border: '1px solid #82c91e', display: 'inline-block' }} />Open
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#666' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#f9f9f7', border: '1px solid #ddd', display: 'inline-block' }} />Closed
          </span>
        </div>

        {/* Slot / time picker below calendar once a date is selected */}
        {selectedDate && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--tblr-border-color, #dee2e6)' }}>
            <div className="text-muted mb-2" style={{ fontSize: 12 }}>{fmtShort(selectedDate)}</div>

            {(bookingMode === 'availability_only' || bookingMode === 'hybrid') && (
              <>
                {slotsLoading && <div className="text-muted" style={{ fontSize: 13 }}>Loading slots…</div>}
                {slotsError && <div className="alert alert-danger py-1" style={{ fontSize: 12 }}>{slotsError}</div>}
                {!slotsLoading && availSlots.length === 0 && (
                  <div className="text-muted" style={{ fontSize: 13 }}>No slots available on this day.</div>
                )}
                {!slotsLoading && availSlots.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                    {availSlots.map(s => (
                      <button key={s.start_at} type="button"
                        className={`btn btn-sm ${selectedSlot?.start_at === s.start_at ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => onSelectSlot(selectedSlot?.start_at === s.start_at ? null : s)}>
                        {fmtTime(s.start_at)}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {bookingMode === 'free' && (
              <>
                {maxHours && <div className="text-muted mb-1" style={{ fontSize: 12 }}>Max: {fmtDuration(maxHours)}</div>}
                <div className="mb-2">
                  <label className="form-label">Start</label>
                  <input type="datetime-local" className="form-control form-control-sm" value={freeStart} onChange={e => onFreeStartChange(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">End</label>
                  <input type="datetime-local" className="form-control form-control-sm" value={freeEnd} min={freeStart} onChange={e => onFreeEndChange(e.target.value)} />
                </div>
                {durationWarning && <div className="alert alert-warning py-1 mt-2" style={{ fontSize: 12 }}>{durationWarning}</div>}
              </>
            )}

            {bookingMode === 'hybrid' && (
              <>
                {availSlots.length > 0 && <div className="text-muted mt-2 mb-1" style={{ fontSize: 12 }}>Or custom time:</div>}
                {maxHours && <div className="text-muted mb-1" style={{ fontSize: 12 }}>Max: {fmtDuration(maxHours)}</div>}
                <div className="mb-2">
                  <label className="form-label">Start</label>
                  <input type="datetime-local" className="form-control form-control-sm" value={freeStart} onChange={e => { onFreeStartChange(e.target.value); onSelectSlot(null); }} />
                </div>
                <div>
                  <label className="form-label">End</label>
                  <input type="datetime-local" className="form-control form-control-sm" value={freeEnd} min={freeStart} onChange={e => { onFreeEndChange(e.target.value); onSelectSlot(null); }} />
                </div>
                {durationWarning && <div className="alert alert-warning py-1 mt-2" style={{ fontSize: 12 }}>{durationWarning}</div>}
              </>
            )}
          </div>
        )}

        {!selectedDate && (
          <p className="text-muted mt-3 mb-0" style={{ fontSize: 13 }}>Select a date to see availability.</p>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function BookingFormSplit({
  resources = [],
  apiError = '',
  initialDraft = null,
  draftExpired = false,
  draftToken = null,
  confirmationMessage = '',
  tenantBrandColour = '',
}) {
  const [resourceId, setResourceId] = useState(initialDraft?.resource_id || resources[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState(initialDraft?.preferred_date || null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [freeStart, setFreeStart] = useState('');
  const [freeEnd, setFreeEnd] = useState('');
  const [durationWarning, setDurationWarning] = useState('');

  const [form, setForm] = useState({
    firstName: (initialDraft?.customer_name || '').split(' ')[0] || '',
    lastName: (initialDraft?.customer_name || '').split(' ').slice(1).join(' ') || '',
    email: initialDraft?.customer_email || '',
    phone: initialDraft?.customer_phone || '',
    partySize: initialDraft?.party_size || 1,
    notes: initialDraft?.notes || '',
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const [closedDates, setClosedDates] = useState(new Set());
  const [fullDates, setFullDates] = useState(new Set());
  const [calLoading, setCalLoading] = useState(false);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [currentDraftToken] = useState(draftToken || null);

  const selectedResource = useMemo(() => resources.find(r => r.id === resourceId) || null, [resources, resourceId]);
  const bookingMode = selectedResource?.booking_mode || 'free';
  const maxHours = selectedResource?.max_booking_duration_hours ? Number(selectedResource.max_booking_duration_hours) : null;

  useEffect(() => {
    if (!resourceId || !selectedResource?.has_rules) { setClosedDates(new Set()); setFullDates(new Set()); return; }
    const from = localDateStr(new Date()); const to = localDateStr(addDays(new Date(), 60));
    setCalLoading(true);
    fetch(`/api/calendar/public-availability?resource_id=${encodeURIComponent(resourceId)}&from=${from}&to=${to}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        const closed = new Set(); const full = new Set();
        for (const d of data?.per_day || []) { if (!d.is_open) closed.add(d.date); else if (d.available_slots === 0) full.add(d.date); }
        setClosedDates(closed); setFullDates(full);
      }).catch(() => {}).finally(() => setCalLoading(false));
  }, [resourceId]);

  useEffect(() => {
    if (!resourceId || !selectedDate || bookingMode === 'free') { setSlots([]); return; }
    setSlotsLoading(true); setSlotsError(''); setSelectedSlot(null);
    fetch(`/api/calendar/public-availability?resource_id=${encodeURIComponent(resourceId)}&from=${selectedDate}&to=${selectedDate}`, { cache: 'no-store' })
      .then(r => r.json()).then(data => setSlots(data?.slots || []))
      .catch(() => setSlotsError('Unable to load slots.')).finally(() => setSlotsLoading(false));
  }, [resourceId, selectedDate, bookingMode]);

  useEffect(() => {
    if (selectedDate && bookingMode === 'free') { setFreeStart(`${selectedDate}T09:00`); setFreeEnd(`${selectedDate}T10:00`); }
  }, [selectedDate, bookingMode]);

  useEffect(() => {
    if (!freeStart || !freeEnd || !maxHours) { setDurationWarning(''); return; }
    const diff = (new Date(freeEnd) - new Date(freeStart)) / 3600000;
    if (diff > maxHours) {
      const snapped = new Date(new Date(freeStart).getTime() + maxHours * 3600000);
      const pad = n => String(n).padStart(2,'0');
      setFreeEnd(`${snapped.getFullYear()}-${pad(snapped.getMonth()+1)}-${pad(snapped.getDate())}T${pad(snapped.getHours())}:${pad(snapped.getMinutes())}`);
      setDurationWarning(`Adjusted to max ${fmtDuration(maxHours)}.`);
    } else setDurationWarning('');
  }, [freeStart, freeEnd, maxHours]);

  function fc(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function handleSubmit() {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = true;
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = true;
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({}); setSubmitting(true); setSubmitError('');

    let startAt, endAt;
    if (bookingMode === 'free' || (bookingMode === 'hybrid' && !selectedSlot)) {
      if (!freeStart || !freeEnd) { setSubmitError('Please enter a time range.'); setSubmitting(false); return; }
      startAt = new Date(freeStart).toISOString(); endAt = new Date(freeEnd).toISOString();
    } else {
      if (!selectedSlot) { setSubmitError('Please select a slot.'); setSubmitting(false); return; }
      startAt = selectedSlot.start_at; endAt = selectedSlot.end_at;
    }

    try {
      const r = await fetch('/api/public-bookings/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_id: resourceId,
          customer_name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
          customer_email: form.email.trim(),
          customer_phone: form.phone.trim() || undefined,
          party_size: form.partySize,
          notes: form.notes.trim() || undefined,
          start_at: startAt, end_at: endAt,
          draft_token: currentDraftToken || undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setSubmitError(r.status === 409 ? 'This slot was just taken — please choose another.' : data?.error || 'Unable to submit.');
        if (r.status === 409) setSelectedSlot(null);
        return;
      }
      setSubmitSuccess(true);
      window.history.replaceState({}, '', window.location.pathname);
    } catch { setSubmitError('Unable to submit. Please check your connection.'); }
    finally { setSubmitting(false); }
  }

  // ── Success ───────────────────────────────────────────────────────────────

  if (submitSuccess) {
    return (
      <div className="card">
        <div className="card-body text-center py-5">
          <div className="mb-3" style={{ fontSize: 48 }}>✓</div>
          <h3>Booking request received</h3>
          <p className="text-muted">{confirmationMessage || `Thanks ${form.firstName} — we'll be in touch at ${form.email} to confirm.`}</p>
          <a href="/book" className="btn btn-outline-primary mt-2">Make another booking</a>
        </div>
      </div>
    );
  }

  if (apiError && resources.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-4">
          <p className="text-muted">Booking is not available right now. Please try again shortly.</p>
        </div>
      </div>
    );
  }

  const canSubmit = selectedDate && (selectedSlot || (bookingMode !== 'availability_only' && freeStart && freeEnd));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', minHeight: 520 }}>

        {/* Left: 50% — calendar */}
        <CalendarPanel
          resources={resources}
          resourceId={resourceId}
          onResourceChange={id => { setResourceId(id); setSelectedDate(null); setSelectedSlot(null); }}
          selectedDate={selectedDate}
          onSelectDate={d => { setSelectedDate(d); setSelectedSlot(null); }}
          closedDates={closedDates}
          fullDates={fullDates}
          hasRules={selectedResource?.has_rules || false}
          calLoading={calLoading}
          slots={slots}
          slotsLoading={slotsLoading}
          slotsError={slotsError}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
          bookingMode={bookingMode}
          freeStart={freeStart}
          freeEnd={freeEnd}
          onFreeStartChange={setFreeStart}
          onFreeEndChange={setFreeEnd}
          durationWarning={durationWarning}
          maxHours={maxHours}
        />

        {/* Right: 50% — contact form */}
        <div style={{ flex: '0 0 50%', overflowY: 'auto' }}>
          {!selectedDate ? (
            <div className="card-body d-flex align-items-center justify-content-center h-100">
              <div className="text-center text-muted">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <p className="mb-0 small">Select a date to continue</p>
              </div>
            </div>
          ) : !canSubmit ? (
            <div className="card-body d-flex align-items-center justify-content-center h-100">
              <p className="text-muted small mb-0">Select a time to fill in your details</p>
            </div>
          ) : (
            <div className="card-body">

              {/* Booking summary */}
              <div className="mb-3 pb-3" style={{ borderBottom: '1px solid var(--tblr-border-color, #dee2e6)' }}>
                <div className="fw-medium">{selectedResource?.name}</div>
                <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {fmtShort(selectedDate)}
                  {selectedSlot && ` · ${fmtTime(selectedSlot.start_at)}–${fmtTime(selectedSlot.end_at)}`}
                  {!selectedSlot && freeStart && ` · ${new Date(freeStart).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}–${new Date(freeEnd).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
                </div>
              </div>

              {submitError && <div className="alert alert-danger">{submitError}</div>}

              <div className="mb-1" style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#868e96', marginBottom: 10 }}>
                Your details
              </div>

              <div className="row g-2 mb-2">
                <div className="col-6">
                  <label className="form-label">First name</label>
                  <input type="text" className={`form-control ${fieldErrors.firstName ? 'is-invalid' : ''}`} value={form.firstName} onChange={e => fc('firstName', e.target.value)} placeholder="Jane" />
                </div>
                <div className="col-6">
                  <label className="form-label">Last name</label>
                  <input type="text" className="form-control" value={form.lastName} onChange={e => fc('lastName', e.target.value)} placeholder="Smith" />
                </div>
              </div>
              <div className="mb-2">
                <label className="form-label">Email</label>
                <input type="email" className={`form-control ${fieldErrors.email ? 'is-invalid' : ''}`} value={form.email} onChange={e => fc('email', e.target.value)} placeholder="jane@example.com" />
                {fieldErrors.email && <div className="invalid-feedback">Please enter a valid email address.</div>}
              </div>
              <div className="row g-2 mb-2">
                <div className="col-7">
                  <label className="form-label">Phone <span className="text-muted">(optional)</span></label>
                  <input type="tel" className="form-control" value={form.phone} onChange={e => fc('phone', e.target.value)} placeholder="+44 7700 900000" />
                </div>
                <div className="col-5">
                  <label className="form-label">Party size</label>
                  <input type="number" className="form-control" min="1" value={form.partySize} onChange={e => fc('partySize', Math.max(1, parseInt(e.target.value) || 1))} />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Notes <span className="text-muted">(optional)</span></label>
                <textarea className="form-control" rows={2} value={form.notes} onChange={e => fc('notes', e.target.value)} placeholder="Anything we should know…" />
              </div>

              <button type="button" className="btn btn-primary w-100" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit booking request'}
              </button>
              <p className="text-muted text-center mt-2 mb-0" style={{ fontSize: 12 }}>
                Your request will be reviewed and confirmed by the team.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
