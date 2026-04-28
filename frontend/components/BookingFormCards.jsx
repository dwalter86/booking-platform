'use client';

/**
 * BookingFormCards — progressive card reveal using Tabler styling.
 * Each step is a card that collapses to a summary when complete.
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

// ── Step card wrapper ─────────────────────────────────────────────────────────

function StepCard({ stepNum, title, isActive, isDone, summary, onEdit, children }) {
  return (
    <div className={`card mb-3 ${isActive ? 'border-primary' : isDone ? 'border-success' : ''}`} style={{ borderWidth: isActive || isDone ? 2 : 1 }}>
      <div className={`card-header ${isActive ? 'bg-primary text-white' : isDone ? 'bg-success-lt' : ''}`}>
        <div className="d-flex align-items-center justify-content-between w-100">
          <div className="d-flex align-items-center gap-2">
            {isDone && !isActive ? (
              <span className="badge bg-success" style={{ width: 22, height: 22, borderRadius: '50%', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>✓</span>
            ) : (
              <span className={`badge ${isActive ? 'bg-white text-primary' : 'bg-secondary'}`} style={{ width: 22, height: 22, borderRadius: '50%', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>{stepNum}</span>
            )}
            <span className={`fw-medium ${isActive ? 'text-white' : isDone ? 'text-success' : 'text-muted'}`} style={{ fontSize: 13 }}>{title}</span>
          </div>
          {isDone && !isActive && onEdit && (
            <button type="button" className="btn btn-sm btn-ghost-success" onClick={onEdit} style={{ fontSize: 12 }}>Change</button>
          )}
        </div>
      </div>

      {isDone && !isActive && summary && (
        <div className="card-body py-2 px-3">
          <span className="text-muted small">{summary}</span>
        </div>
      )}

      {isActive && (
        <div className="card-body">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Mini calendar ─────────────────────────────────────────────────────────────

function MiniCalendar({ selectedDate, onSelect, closedDates, fullDates, hasRules }) {
  const today = localDateStr(new Date());
  const now = new Date();
  const [vy, setVy] = useState(now.getFullYear());
  const [vm, setVm] = useState(now.getMonth());
  const dim = getDaysInMonth(vy, vm);
  const first = getFirstDayOfMonth(vy, vm);
  const monthLabel = new Date(vy, vm, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const cells = [...Array(first).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => vm === 0 ? (setVm(11), setVy(y => y - 1)) : setVm(m => m - 1)}>‹</button>
        <span style={{ fontWeight: 500, fontSize: 13 }}>{monthLabel}</span>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => vm === 11 ? (setVm(0), setVy(y => y + 1)) : setVm(m => m + 1)}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center' }}>
        {['M','T','W','T','F','S','S'].map((d, i) => <div key={i} style={{ fontSize: 10, fontWeight: 600, color: '#adb5bd', padding: '3px 0' }}>{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const str = `${vy}-${String(vm+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          const isPast = str < today;
          const isClosed = closedDates.has(str) || fullDates.has(str);
          const isSelected = str === selectedDate;
          const canSelect = !isPast && !isClosed;
          let bg = 'transparent', color = '#212529', textDecoration = 'none', cursor = 'pointer';
          if (isSelected) { bg = '#206bc4'; color = '#fff'; }
          else if (isClosed || isPast) { color = '#dee2e6'; cursor = 'not-allowed'; }
          else if (hasRules) { bg = '#d3f9d8'; color = '#1a7a2e'; }
          return (
            <div key={str} onClick={() => canSelect && onSelect(str)}
              style={{ padding: '5px 2px', fontSize: 12, borderRadius: 4, background: bg, color, textDecoration, cursor, lineHeight: 1.3, userSelect: 'none' }}>
              {d}
            </div>
          );
        })}
      </div>
      <div className="d-flex gap-3 mt-2">
        {hasRules && <span style={{ fontSize: 11, color: '#868e96', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#d3f9d8', border: '1px solid #82c91e', display: 'inline-block' }} /> Open</span>}
        <span style={{ fontSize: 11, color: '#868e96', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#f8f9fa', border: '1px solid #dee2e6', display: 'inline-block' }} /> Closed</span>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function BookingFormCards({ resources = [], apiError = '', initialDraft = null, draftExpired = false, draftToken = null, confirmationMessage = '', tenantBrandColour = '' }) {
  const singleResource = resources.length === 1;
  const [activeCard, setActiveCard] = useState(singleResource ? 1 : 0);

  const [resourceId, setResourceId] = useState(initialDraft?.resource_id || resources[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState(initialDraft?.preferred_date || null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [freeStart, setFreeStart] = useState('');
  const [freeEnd, setFreeEnd] = useState('');
  const [durationWarning, setDurationWarning] = useState('');
  const [form, setForm] = useState({ firstName: (initialDraft?.customer_name || '').split(' ')[0] || '', lastName: (initialDraft?.customer_name || '').split(' ').slice(1).join(' ') || '', email: initialDraft?.customer_email || '', phone: initialDraft?.customer_phone || '', partySize: initialDraft?.party_size || 1, notes: initialDraft?.notes || '' });
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
      .then(r => r.json()).then(data => { const closed = new Set(); const full = new Set(); for (const d of data?.per_day || []) { if (!d.is_open) closed.add(d.date); else if (d.available_slots === 0) full.add(d.date); } setClosedDates(closed); setFullDates(full); }).catch(() => {}).finally(() => setCalLoading(false));
  }, [resourceId]);

  useEffect(() => {
    if (activeCard !== 2 || !resourceId || !selectedDate || bookingMode === 'free') { setSlots([]); return; }
    setSlotsLoading(true); setSlotsError(''); setSelectedSlot(null);
    fetch(`/api/calendar/public-availability?resource_id=${encodeURIComponent(resourceId)}&from=${selectedDate}&to=${selectedDate}`, { cache: 'no-store' })
      .then(r => r.json()).then(data => setSlots(data?.slots || [])).catch(() => setSlotsError('Unable to load slots.')).finally(() => setSlotsLoading(false));
  }, [activeCard, resourceId, selectedDate, bookingMode]);

  useEffect(() => { if (selectedDate && bookingMode === 'free') { setFreeStart(`${selectedDate}T09:00`); setFreeEnd(`${selectedDate}T10:00`); } }, [selectedDate, bookingMode]);

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

  const slotsForDay = slots.filter(s => s.start_at?.startsWith(selectedDate || ''));
  const availSlots = slotsForDay.filter(s => !s.blocked && s.is_available && new Date(s.start_at) >= new Date());

  const timeSummary = selectedSlot
    ? `${fmtTime(selectedSlot.start_at)} – ${fmtTime(selectedSlot.end_at)}`
    : (freeStart && freeEnd)
      ? `${new Date(freeStart).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} – ${new Date(freeEnd).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
      : '';

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
      const r = await fetch('/api/public-bookings/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource_id: resourceId, customer_name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(), customer_email: form.email.trim(), customer_phone: form.phone.trim() || undefined, party_size: form.partySize, notes: form.notes.trim() || undefined, start_at: startAt, end_at: endAt, draft_token: currentDraftToken || undefined }) });
      const data = await r.json();
      if (!r.ok) { setSubmitError(r.status === 409 ? 'This slot was just taken — please choose another.' : data?.error || 'Unable to submit.'); if (r.status === 409) setSelectedSlot(null); return; }
      setSubmitSuccess(true); window.history.replaceState({}, '', window.location.pathname);
    } catch { setSubmitError('Unable to submit. Please check your connection.'); } finally { setSubmitting(false); }
  }

  if (submitSuccess) {
    return <div className="card"><div className="card-body text-center py-5"><div className="mb-3" style={{ fontSize: 48 }}>✓</div><h3>Booking request received</h3><p className="text-muted">{confirmationMessage || `Thanks ${form.firstName} — we'll be in touch at ${form.email} to confirm.`}</p><a href="/book" className="btn btn-outline-primary mt-2">Make another booking</a></div></div>;
  }

  if (apiError && resources.length === 0) {
    return <div className="card"><div className="card-body text-center py-4"><p className="text-muted">Booking is not available right now. Please try again shortly.</p></div></div>;
  }

  const stepOffset = singleResource ? 0 : 1;

  return (
    <div>
      {/* Card 0 — Resource */}
      {!singleResource && (
        <StepCard stepNum={1} title="What would you like to book?" isActive={activeCard === 0} isDone={activeCard > 0} summary={selectedResource?.name} onEdit={() => setActiveCard(0)}>
          <div className="row g-2">
            {resources.map(r => (
              <div key={r.id} className="col-md-6">
                <div onClick={() => { setResourceId(r.id); setSelectedDate(null); setSelectedSlot(null); setActiveCard(1); }}
                  className={`card card-link h-100 ${r.id === resourceId ? 'border-primary' : ''}`} style={{ cursor: 'pointer', borderWidth: r.id === resourceId ? 2 : 1 }}>
                  <div className="card-body py-2">
                    <div className="fw-medium">{r.name}</div>
                    {r.description && <div className="text-muted small">{r.description}</div>}
                    <div className="text-muted small">Capacity: {r.capacity}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </StepCard>
      )}

      {/* Card 1 — Date */}
      <StepCard stepNum={1 + stepOffset} title="When would you like to book?" isActive={activeCard === 1} isDone={activeCard > 1} summary={selectedDate ? fmtShort(selectedDate) : null} onEdit={() => setActiveCard(1)}>
        {calLoading ? <p className="text-muted small">Loading availability…</p> : (
          <MiniCalendar selectedDate={selectedDate} onSelect={d => { setSelectedDate(d); setSelectedSlot(null); }} closedDates={closedDates} fullDates={fullDates} hasRules={selectedResource?.has_rules || false} />
        )}
        {selectedDate && <p className="text-muted small mt-2 mb-0">Selected: {fmtShort(selectedDate)}</p>}
        <div className="mt-3">
          <button type="button" className="btn btn-primary" disabled={!selectedDate} onClick={() => selectedDate && setActiveCard(2)}>Continue →</button>
        </div>
      </StepCard>

      {/* Card 2 — Time */}
      {activeCard >= 2 && (
        <StepCard stepNum={2 + stepOffset} title="What time?" isActive={activeCard === 2} isDone={activeCard > 2} summary={timeSummary} onEdit={() => setActiveCard(2)}>
          {(bookingMode === 'availability_only' || bookingMode === 'hybrid') && (<div className="mb-3">
            {slotsLoading && <p className="text-muted small">Loading slots…</p>}
            {slotsError && <div className="alert alert-danger py-2 small">{slotsError}</div>}
            {!slotsLoading && availSlots.length === 0 && <p className="text-muted small">No slots available — try a different date.</p>}
            {!slotsLoading && availSlots.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {availSlots.map(s => (
                  <button key={s.start_at} type="button" className={`btn btn-sm ${selectedSlot?.start_at === s.start_at ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setSelectedSlot(selectedSlot?.start_at === s.start_at ? null : s)}>
                    {fmtTime(s.start_at)}
                  </button>
                ))}
              </div>
            )}
          </div>)}

          {(bookingMode === 'free' || bookingMode === 'hybrid') && (<div className={bookingMode === 'hybrid' && availSlots.length > 0 ? 'mt-3' : ''}>
            {bookingMode === 'hybrid' && availSlots.length > 0 && <p className="text-muted small mb-2">Or enter a custom time:</p>}
            {maxHours && <div className="alert alert-info py-1 small mb-2">Max: <strong>{fmtDuration(maxHours)}</strong></div>}
            <div className="row g-2 mb-2">
              <div className="col-6"><label className="form-label">Start</label><input type="datetime-local" className="form-control" value={freeStart} onChange={e => { setFreeStart(e.target.value); if (bookingMode === 'hybrid') setSelectedSlot(null); }} /></div>
              <div className="col-6"><label className="form-label">End</label><input type="datetime-local" className="form-control" value={freeEnd} min={freeStart} onChange={e => { setFreeEnd(e.target.value); if (bookingMode === 'hybrid') setSelectedSlot(null); }} /></div>
            </div>
            {durationWarning && <div className="alert alert-warning py-1 small">{durationWarning}</div>}
          </div>)}

          <div className="mt-3">
            <button type="button" className="btn btn-primary"
              disabled={!selectedSlot && !(bookingMode !== 'availability_only' && freeStart && freeEnd)}
              onClick={() => (selectedSlot || (bookingMode !== 'availability_only' && freeStart && freeEnd)) && setActiveCard(3)}>
              Continue →
            </button>
          </div>
        </StepCard>
      )}

      {/* Card 3 — Details */}
      {activeCard >= 3 && (
        <StepCard stepNum={3 + stepOffset} title="Your details" isActive={activeCard === 3} isDone={false}>
          {submitError && <div className="alert alert-danger">{submitError}</div>}
          <div className="row g-2 mb-2">
            <div className="col-6"><label className="form-label">First name *</label><input type="text" className={`form-control ${fieldErrors.firstName ? 'is-invalid' : ''}`} value={form.firstName} onChange={e => fc('firstName', e.target.value)} placeholder="Jane" /></div>
            <div className="col-6"><label className="form-label">Last name</label><input type="text" className="form-control" value={form.lastName} onChange={e => fc('lastName', e.target.value)} placeholder="Smith" /></div>
          </div>
          <div className="mb-2"><label className="form-label">Email *</label><input type="email" className={`form-control ${fieldErrors.email ? 'is-invalid' : ''}`} value={form.email} onChange={e => fc('email', e.target.value)} placeholder="jane@example.com" />{fieldErrors.email && <div className="invalid-feedback">Please enter a valid email address.</div>}</div>
          <div className="row g-2 mb-2">
            <div className="col-7"><label className="form-label">Phone <span className="text-muted">(optional)</span></label><input type="tel" className="form-control" value={form.phone} onChange={e => fc('phone', e.target.value)} placeholder="+44 7700 900000" /></div>
            <div className="col-5"><label className="form-label">Party size</label><input type="number" className="form-control" min="1" value={form.partySize} onChange={e => fc('partySize', Math.max(1, parseInt(e.target.value) || 1))} /></div>
          </div>
          <div className="mb-3"><label className="form-label">Notes <span className="text-muted">(optional)</span></label><textarea className="form-control" rows={2} value={form.notes} onChange={e => fc('notes', e.target.value)} placeholder="Anything we should know…" /></div>
          <button type="button" className="btn btn-primary w-100" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit booking request'}</button>
          <p className="text-muted text-center mt-2 mb-0" style={{ fontSize: 12 }}>Your request will be reviewed and confirmed by the team.</p>
        </StepCard>
      )}
    </div>
  );
}
