'use client';

/**
 * BookingFormClassic — the original Availio booking form.
 * Refactored from PublicBookingCalendarClient into a single-resource component.
 * Receives exactly one resource via the resources prop (always resources[0]).
 * The multi-resource picker has been removed — resource selection now happens
 * at the URL level (/book/[slug]).
 */

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function localDateStr(date) {
  return (
    date.getFullYear() +
    '-' + String(date.getMonth() + 1).padStart(2, '0') +
    '-' + String(date.getDate()).padStart(2, '0')
  );
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDisplayDateShort(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(hours) {
  if (!hours) return '';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

// ---------------------------------------------------------------------------
// Mini calendar component
// ---------------------------------------------------------------------------

function MiniCalendar({ selectedDate, onSelectDate, closedDates, fullDates, hasRules }) {
  const today = localDateStr(new Date());
  const todayDate = new Date();

  const [viewYear, setViewYear] = useState(() => {
    if (selectedDate) return parseInt(selectedDate.split('-')[0]);
    return todayDate.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    if (selectedDate) return parseInt(selectedDate.split('-')[1]) - 1;
    return todayDate.getMonth();
  });

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-GB', {
    month: 'long', year: 'numeric'
  });

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={prevMonth}>&larr;</button>
        <span style={{ fontWeight: 500, fontSize: 13 }}>{monthName}</span>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={nextMonth}>&rarr;</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, textAlign: 'center' }}>
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <div key={i} style={{ fontSize: 11, fontWeight: 500, color: '#868e96', padding: '3px 0' }}>{d}</div>
        ))}
        {days.map((d, i) => {
          if (!d) return <div key={`empty-${i}`} />;

          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const isPast = dateStr < today;
          const isToday = dateStr === today;
          const isClosed = closedDates.has(dateStr);
          const isFull = fullDates.has(dateStr);
          const isSelected = dateStr === selectedDate;
          const isSelectable = !isPast && !isClosed && !isFull;

          let bg = 'transparent';
          let color = '#212529';
          let textDecoration = 'none';
          let cursor = 'pointer';
          let fontWeight = isToday ? 600 : 400;
          let borderRadius = 4;

          if (isSelected) { bg = '#206bc4'; color = '#fff'; }
          else if (isClosed) { bg = '#f9f9f7'; color = '#bbb'; textDecoration = 'line-through'; cursor = 'not-allowed'; }
          else if (isFull) { color = '#bbb'; textDecoration = 'line-through'; cursor = 'not-allowed'; }
          else if (isPast) { color = '#ccc'; cursor = 'not-allowed'; }
          else if (hasRules) { bg = '#d3f9d8'; color = '#1a7a2e'; }

          return (
            <div
              key={dateStr}
              onClick={() => isSelectable && onSelectDate(dateStr)}
              style={{
                padding: '5px 2px', fontSize: 12, borderRadius,
                background: bg, color, textDecoration, cursor,
                fontWeight, lineHeight: 1.3, userSelect: 'none',
              }}
              title={isClosed ? 'Closed' : isFull ? 'Fully booked' : ''}
            >
              {d}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
        {hasRules && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#666' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#d3f9d8', border: '1px solid #82c91e', display: 'inline-block' }} />
            Open
          </span>
        )}
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#666' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#f9f9f7', border: '1px solid #ddd', display: 'inline-block' }} />
          Closed
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#666' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#f0f0f0', border: '1px solid #ccc', display: 'inline-block' }} />
          Full
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slot table
// ---------------------------------------------------------------------------

function SlotTable({ slots, selectedSlot, onSelectSlot, capacity }) {
  const now = new Date();
  const all = slots.filter(s => new Date(s.start_at) >= now);

  if (all.length === 0) return null;

  return (
    <table className="table table-sm" style={{ fontSize: 13 }}>
      <thead>
        <tr>
          <th>Time</th>
          <th>Availability</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {all.map((slot) => {
          const isSelected = selectedSlot?.start_at === slot.start_at;
          const isFull = !slot.is_available && !slot.blocked;
          const isBlocked = slot.blocked;
          const isPast = new Date(slot.start_at) < now;

          let rowClass = '';
          if (isSelected) rowClass = 'slot-row-selected';
          else if (isFull) rowClass = 'slot-row-full';
          else if (isBlocked) rowClass = 'slot-blocked';

          return (
            <tr key={slot.start_at} className={rowClass}>
              <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                {formatTime(slot.start_at)}–{formatTime(slot.end_at)}
              </td>
              <td>
                {isBlocked ? (
                  <span className="text-muted">Unavailable</span>
                ) : isFull ? (
                  <span className="text-muted">Fully booked</span>
                ) : (
                  <>
                    <span style={{ color: '#1a7a2e' }}>Available</span>
                    {capacity > 1 && slot.available_capacity != null && (
                      <div style={{ fontSize: 11, color: '#868e96' }}>
                        {slot.available_capacity} of {capacity} left
                      </div>
                    )}
                  </>
                )}
              </td>
              <td style={{ textAlign: 'right' }}>
                {!isBlocked && !isFull && !isPast ? (
                  <button
                    type="button"
                    className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline-success'}`}
                    onClick={() => onSelectSlot(isSelected ? null : slot)}
                  >
                    {isSelected ? 'Selected' : 'Select'}
                  </button>
                ) : (
                  <span style={{ color: '#ccc', fontSize: 12 }}>—</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function BookingFormClassic({
  resources = [],
  apiError = '',
  initialDraft = null,
  draftExpired = false,
  draftToken = null,
  confirmationMessage = '',
  tenantLogoUrl = '',
  tenantBrandColour = '',
}) {
  // Always use the first (and only) resource passed in
  const selectedResource = resources[0] || null;
  const resourceId = selectedResource?.id || '';

  const bookingMode = selectedResource?.booking_mode || 'free';
  const maxHours = selectedResource?.max_booking_duration_hours
    ? Number(selectedResource.max_booking_duration_hours)
    : null;

  // Step state
  const [step, setStep] = useState(1);
  const [currentDraftToken, setCurrentDraftToken] = useState(draftToken || null);

  // Form fields
  const [selectedDate, setSelectedDate] = useState(initialDraft?.preferred_date || null);
  const [firstName, setFirstName] = useState(() => {
    const name = initialDraft?.customer_name || '';
    return name.split(' ')[0] || '';
  });
  const [lastName, setLastName] = useState(() => {
    const name = initialDraft?.customer_name || '';
    return name.split(' ').slice(1).join(' ') || '';
  });
  const [email, setEmail] = useState(initialDraft?.customer_email || '');
  const [phone, setPhone] = useState(initialDraft?.customer_phone || '');
  const [partySize, setPartySize] = useState(initialDraft?.party_size || 1);
  const [notes, setNotes] = useState(initialDraft?.notes || '');

  // Step 1 state
  const [fieldErrors, setFieldErrors] = useState({});
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaveError, setDraftSaveError] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Calendar data
  const [closedDates, setClosedDates] = useState(new Set());
  const [fullDates, setFullDates] = useState(new Set());
  const [calLoading, setCalLoading] = useState(false);

  // Step 2 state
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Free book time
  const [freeStart, setFreeStart] = useState('');
  const [freeEnd, setFreeEnd] = useState('');
  const [durationWarning, setDurationWarning] = useState('');

  // Hybrid tab
  const [hybridTab, setHybridTab] = useState('slot');

  // Auto-advance to step 2 if draft has all required fields
  useEffect(() => {
    if (initialDraft?.resource_id && initialDraft?.preferred_date && initialDraft?.customer_name && initialDraft?.customer_email) {
      setStep(2);
    }
  }, []);

  // Fetch per-day availability
  useEffect(() => {
    if (!resourceId || !selectedResource?.has_rules) {
      setClosedDates(new Set());
      setFullDates(new Set());
      return;
    }

    const from = localDateStr(new Date());
    const to = localDateStr(addDays(new Date(), 60));

    setCalLoading(true);
    fetch(`/api/calendar/public-availability?resource_id=${encodeURIComponent(resourceId)}&from=${from}&to=${to}`, {
      cache: 'no-store'
    })
      .then(r => r.json())
      .then(data => {
        const closed = new Set();
        const full = new Set();
        for (const day of data?.per_day || []) {
          if (!day.is_open) closed.add(day.date);
          else if (day.available_slots === 0) full.add(day.date);
        }
        setClosedDates(closed);
        setFullDates(full);
      })
      .catch(() => {})
      .finally(() => setCalLoading(false));
  }, [resourceId]);

  // Fetch slots for step 2
  useEffect(() => {
    if (step !== 2 || !resourceId || !selectedDate) return;
    if (bookingMode === 'free') return;

    setSlotsLoading(true);
    setSlotsError('');
    setSelectedSlot(null);

    fetch(`/api/calendar/public-availability?resource_id=${encodeURIComponent(resourceId)}&from=${selectedDate}&to=${selectedDate}`, {
      cache: 'no-store'
    })
      .then(r => r.json())
      .then(data => setSlots(data?.slots || []))
      .catch(() => setSlotsError('Unable to load slots.'))
      .finally(() => setSlotsLoading(false));
  }, [step, resourceId, selectedDate, bookingMode]);

  // Default free times
  useEffect(() => {
    if (selectedDate && bookingMode === 'free') {
      setFreeStart(`${selectedDate}T09:00`);
      setFreeEnd(`${selectedDate}T10:00`);
    }
  }, [selectedDate, bookingMode]);

  // Duration cap
  useEffect(() => {
    if (!freeStart || !freeEnd || !maxHours) { setDurationWarning(''); return; }
    const diff = (new Date(freeEnd) - new Date(freeStart)) / 3600000;
    if (diff > maxHours) {
      const snapped = new Date(new Date(freeStart).getTime() + maxHours * 3600000);
      const pad = n => String(n).padStart(2, '0');
      setFreeEnd(`${snapped.getFullYear()}-${pad(snapped.getMonth()+1)}-${pad(snapped.getDate())}T${pad(snapped.getHours())}:${pad(snapped.getMinutes())}`);
      setDurationWarning(`Adjusted to the maximum booking duration of ${formatDuration(maxHours)}.`);
    } else {
      setDurationWarning('');
    }
  }, [freeStart, freeEnd, maxHours]);

  // Navigate to adjacent available day
  function navigateDay(direction) {
    if (!selectedDate) return;
    const [y, m, d] = selectedDate.split('-').map(Number);
    const current = new Date(y, m - 1, d);
    let next = addDays(current, direction);
    const today = startOfDay(new Date());
    for (let i = 0; i < 60; i++) {
      const str = localDateStr(next);
      if (next >= today && !closedDates.has(str)) {
        setSelectedDate(str);
        return;
      }
      next = addDays(next, direction);
    }
  }

  // Validate step 1
  function validateStep1() {
    const errors = {};
    if (!firstName.trim()) errors.firstName = true;
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = true;
    if (!selectedDate) errors.date = true;
    return errors;
  }

  // Save draft and advance to step 2
  async function handleStep1Submit() {
    const errors = validateStep1();
    if (Object.keys(errors).length > 0) {
      setSubmitAttempted(true);
      setFieldErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setFieldErrors({});
    setDraftSaveError('');
    setSavingDraft(true);

    const payload = {
      token: currentDraftToken || undefined,
      resource_id: resourceId,
      preferred_date: selectedDate,
      customer_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      customer_email: email.trim(),
      customer_phone: phone.trim() || undefined,
      party_size: partySize,
      notes: notes.trim() || undefined,
      booking_mode: bookingMode,
    };

    async function attemptSave() {
      const r = await fetch('/api/public-bookings/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('Draft save failed');
      return r.json();
    }

    try {
      let data;
      try { data = await attemptSave(); }
      catch { data = await attemptSave(); } // retry once
      setCurrentDraftToken(data.token);
      window.history.replaceState({}, '', `?draft=${data.token}`);
      setFieldErrors({});
      setStep(2);
    } catch {
      setDraftSaveError('We couldn\'t save your details. Please check your connection and try again.');
    } finally {
      setSavingDraft(false);
    }
  }

  // Final submit
  async function handleSubmit() {
    setSubmitError('');
    setSubmitting(true);

    let startAt, endAt;

    if (bookingMode === 'free' || (bookingMode === 'hybrid' && hybridTab === 'free')) {
      if (!freeStart || !freeEnd) {
        setSubmitError('Please select a start and end time.');
        setSubmitting(false);
        return;
      }
      startAt = new Date(freeStart).toISOString();
      endAt = new Date(freeEnd).toISOString();
    } else {
      if (!selectedSlot) {
        setSubmitError('Please select a slot.');
        setSubmitting(false);
        return;
      }
      startAt = selectedSlot.start_at;
      endAt = selectedSlot.end_at;
    }

    try {
      const r = await fetch('/api/public-bookings/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_id: resourceId,
          customer_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          customer_email: email.trim(),
          customer_phone: phone.trim() || undefined,
          party_size: partySize,
          notes: notes.trim() || undefined,
          start_at: startAt,
          end_at: endAt,
          draft_token: currentDraftToken || undefined,
        }),
      });

      const data = await r.json();

      if (!r.ok) {
        if (r.status === 409) {
          setSubmitError('This slot was just taken — please choose another time.');
          setSelectedSlot(null);
        } else {
          setSubmitError(data?.error || 'Unable to submit booking. Please try again.');
        }
        return;
      }

      setSubmitSuccess(true);
      window.history.replaceState({}, '', window.location.pathname);
    } catch {
      setSubmitError('Unable to submit booking. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render — success
  // ---------------------------------------------------------------------------

  if (submitSuccess) {
    return (
      <div className="text-center py-4">
        <div className="mb-3" style={{ fontSize: 48 }}>✓</div>
        <h3>Booking request received</h3>
        <p className="text-muted">
          {confirmationMessage
            ? confirmationMessage
            : `Thanks ${firstName} — we'll be in touch at ${email} to confirm your booking.`}
        </p>
        <a href="/book" className="btn btn-outline-primary mt-2">Make another booking</a>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render — API failure
  // ---------------------------------------------------------------------------

  if (apiError && !selectedResource) {
    return (
      <div className="text-center py-4">
        <p className="text-muted mb-3">Booking is not available right now. Please try again shortly.</p>
        <button className="btn btn-outline-secondary" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Step bar
  // ---------------------------------------------------------------------------

  const stepBar = (
    <div style={{ display: 'flex', marginBottom: 20 }}>
      {[
        { n: 1, label: 'Your details' },
        { n: 2, label: bookingMode === 'free' ? 'Choose time' : bookingMode === 'hybrid' ? 'Pick slot or time' : 'Pick a slot' },
      ].map(({ n, label }) => {
        const isActive = step === n;
        const isDone = step > n;
        return (
          <div
            key={n}
            onClick={() => isDone && setStep(n)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 0', fontSize: 13, cursor: isDone ? 'pointer' : 'default',
              borderBottom: `2px solid ${isActive ? '#206bc4' : isDone ? '#2fb344' : '#dee2e6'}`,
              color: isActive ? '#212529' : '#868e96',
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 500,
              background: isActive ? '#206bc4' : isDone ? '#2fb344' : 'transparent',
              border: `1.5px solid ${isActive ? '#206bc4' : isDone ? '#2fb344' : '#adb5bd'}`,
              color: (isActive || isDone) ? '#fff' : '#adb5bd',
            }}>
              {isDone ? '✓' : n}
            </div>
            {label}
          </div>
        );
      })}
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render — step 1
  // ---------------------------------------------------------------------------

  if (step === 1) {
    return (
      <>
        {stepBar}

        {draftExpired && (
          <div className="alert alert-warning">
            Your saved details have expired — please re-enter below.
          </div>
        )}

        {submitAttempted && Object.keys(fieldErrors).some(k => fieldErrors[k]) && (
          <div className="alert alert-danger">
            Please fill in the required fields:{' '}
            <strong>
              {[
                fieldErrors.firstName && 'First name',
                fieldErrors.email && 'Email',
                fieldErrors.date && 'Preferred date',
              ].filter(Boolean).join(', ')}
            </strong>
          </div>
        )}

        {draftSaveError && (
          <div className="alert alert-danger">{draftSaveError}</div>
        )}

        <div className="row g-3">
          {/* Details form */}
          <div className="col-md-7">
            <div className="mb-1" style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#868e96', marginBottom: 10 }}>
              Your details
            </div>

            <div className="row g-2 mb-2">
              <div className="col-6">
                <label className="form-label">First name</label>
                <input
                  className={`form-control ${fieldErrors.firstName ? 'is-invalid' : ''}`}
                  type="text" value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Jane"
                />
              </div>
              <div className="col-6">
                <label className="form-label">Last name</label>
                <input className="form-control" type="text" value={lastName}
                  onChange={e => setLastName(e.target.value)} placeholder="Smith" />
              </div>
            </div>

            <div className="mb-2">
              <label className="form-label">Email</label>
              <input
                className={`form-control ${fieldErrors.email ? 'is-invalid' : ''}`}
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </div>

            <div className="row g-2 mb-2">
              <div className="col-7">
                <label className="form-label">Phone <span className="text-muted">(optional)</span></label>
                <input className="form-control" type="text" value={phone}
                  onChange={e => setPhone(e.target.value)} placeholder="+44 7700 900000" />
              </div>
              <div className="col-5">
                <label className="form-label">Party size</label>
                <input className="form-control" type="number" min="1"
                  value={partySize} onChange={e => setPartySize(Math.max(1, parseInt(e.target.value) || 1))} />
              </div>
            </div>

            <div className="mb-2">
              <label className="form-label">Notes <span className="text-muted">(optional)</span></label>
              <textarea className="form-control" rows={2} value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Anything we should know…" style={{ resize: 'vertical' }} />
            </div>
          </div>

          {/* Mini calendar */}
          <div className="col-md-5">
            <div className="mb-1" style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#868e96', marginBottom: 10 }}>
              Preferred date
            </div>
            {calLoading ? (
              <div className="text-muted" style={{ fontSize: 13 }}>Loading availability…</div>
            ) : (
              <MiniCalendar
                selectedDate={selectedDate}
                onSelectDate={d => { setSelectedDate(d); setFieldErrors(e => ({ ...e, date: false })); }}
                closedDates={closedDates}
                fullDates={fullDates}
                hasRules={selectedResource?.has_rules || false}
              />
            )}
            {selectedDate && (
              <div className="text-muted mt-2" style={{ fontSize: 12 }}>
                Selected: {formatDisplayDateShort(selectedDate)}
              </div>
            )}
            {fieldErrors.date && (
              <div className="text-danger mt-1" style={{ fontSize: 12 }}>Please select a date.</div>
            )}
          </div>
        </div>

        <div className="d-flex justify-content-end mt-3">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleStep1Submit}
            disabled={savingDraft}
          >
            {savingDraft ? 'Saving…' : 'Save & continue →'}
          </button>
        </div>
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // Render — step 2
  // ---------------------------------------------------------------------------

  const slotsForDay = slots.filter(s => s.start_at?.startsWith(selectedDate));
  const hasNoSlots = !slotsLoading && slotsForDay.length === 0 && bookingMode !== 'free';
  const isCustomTime = bookingMode === 'free' || (bookingMode === 'hybrid' && hybridTab === 'free');
  const submitLabel = isCustomTime ? 'Request this time slot' : 'Submit booking request';

  return (
    <>
      {stepBar}

      {submitError && (
        <div className="alert alert-danger">{submitError}</div>
      )}

      {/* Summary bar */}
      <div className="d-flex justify-content-between align-items-center p-3 mb-3 rounded"
        style={{ background: '#f8f9fa', border: '1px solid #dee2e6', fontSize: 13 }}>
        <div>
          <span>{firstName} {lastName} &middot; {partySize} {partySize === 1 ? 'person' : 'people'} &middot; </span>
          <strong>{selectedResource?.name}</strong>
          <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
            {formatDisplayDateShort(selectedDate)}
          </div>
        </div>
        <button type="button" className="btn btn-sm btn-outline-secondary"
          onClick={() => { setStep(1); setSubmitError(''); }}>
          ← Edit details
        </button>
      </div>

      {/* Day navigation */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <strong style={{ fontSize: 14 }}>{formatDisplayDate(selectedDate)}</strong>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-sm btn-outline-secondary"
            onClick={() => navigateDay(-1)}>← Prev day</button>
          <button type="button" className="btn btn-sm btn-outline-secondary"
            onClick={() => navigateDay(1)}>Next day →</button>
        </div>
      </div>

      {/* Availability only */}
      {bookingMode === 'availability_only' && (
        <>
          {slotsLoading && <div className="text-muted" style={{ fontSize: 13 }}>Loading slots…</div>}
          {slotsError && <div className="alert alert-danger">{slotsError}</div>}
          {hasNoSlots && (
            <div className="text-center p-4 rounded mb-3" style={{ background: '#f8f9fa', border: '1px solid #dee2e6' }}>
              <p className="text-muted mb-3">No slots available on this day.</p>
              <div className="d-flex gap-2 justify-content-center">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => navigateDay(-1)}>← Previous day</button>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => navigateDay(1)}>Next available day →</button>
              </div>
            </div>
          )}
          {!slotsLoading && !hasNoSlots && (
            <SlotTable slots={slotsForDay} selectedSlot={selectedSlot} onSelectSlot={setSelectedSlot} capacity={selectedResource?.capacity || 1} />
          )}
        </>
      )}

      {/* Free book */}
      {bookingMode === 'free' && (
        <>
          {maxHours && (
            <div className="alert alert-info py-2 mb-3" style={{ fontSize: 13 }}>
              Max booking duration: <strong>{formatDuration(maxHours)}</strong>
              {maxHours >= 24 && <span className="text-muted"> &middot; End date can be a later day for multi-day bookings.</span>}
            </div>
          )}
          <div className="row g-2 mb-2">
            <div className="col-6">
              <label className="form-label">Start</label>
              <input className="form-control" type="datetime-local" value={freeStart}
                onChange={e => setFreeStart(e.target.value)} />
            </div>
            <div className="col-6">
              <label className="form-label">End</label>
              <input className="form-control" type="datetime-local" value={freeEnd}
                min={freeStart} onChange={e => setFreeEnd(e.target.value)} />
            </div>
          </div>
          {freeStart && freeEnd && (
            <div className="text-muted mb-2" style={{ fontSize: 12 }}>
              Duration: {formatDuration((new Date(freeEnd) - new Date(freeStart)) / 3600000)}
            </div>
          )}
          {durationWarning && (
            <div className="alert alert-warning py-2 mb-2" style={{ fontSize: 13 }}>{durationWarning}</div>
          )}
          <div className="text-muted mb-3" style={{ fontSize: 12 }}>
            Or drag on the calendar below to set your time.
          </div>
          <div className="card mb-3">
            <div className="card-body p-0">
              <FullCalendar
                plugins={[timeGridPlugin, interactionPlugin]}
                initialView="timeGridDay"
                initialDate={selectedDate || localDateStr(new Date())}
                selectable={true}
                editable={false}
                nowIndicator
                height="auto"
                slotMinTime="06:00:00"
                slotMaxTime="23:00:00"
                headerToolbar={{ left: '', center: 'title', right: '' }}
                select={(info) => {
                  const pad = n => String(n).padStart(2, '0');
                  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                  setFreeStart(fmt(info.start));
                  setFreeEnd(fmt(info.end));
                }}
              />
            </div>
          </div>
        </>
      )}

      {/* Hybrid */}
      {bookingMode === 'hybrid' && (
        <>
          <div className="btn-group mb-3" role="group">
            <button type="button" className={`btn btn-sm ${hybridTab === 'slot' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setHybridTab('slot')}>Pick a slot</button>
            <button type="button" className={`btn btn-sm ${hybridTab === 'free' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setHybridTab('free')}>Custom time <span style={{ fontSize: 10, opacity: 0.7 }}>(advanced)</span></button>
          </div>

          {hybridTab === 'slot' && (
            <>
              {slotsLoading && <div className="text-muted" style={{ fontSize: 13 }}>Loading slots…</div>}
              {hasNoSlots && (
                <div className="text-center p-4 rounded mb-3" style={{ background: '#f8f9fa', border: '1px solid #dee2e6' }}>
                  <p className="text-muted mb-3">No slots available on this day.</p>
                  <div className="d-flex gap-2 justify-content-center">
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => navigateDay(-1)}>← Previous day</button>
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => navigateDay(1)}>Next available day →</button>
                  </div>
                </div>
              )}
              {!slotsLoading && !hasNoSlots && (
                <SlotTable slots={slotsForDay} selectedSlot={selectedSlot} onSelectSlot={setSelectedSlot} capacity={selectedResource?.capacity || 1} />
              )}
            </>
          )}

          {hybridTab === 'free' && (
            <>
              <div className="alert alert-info py-2 mb-3" style={{ fontSize: 13 }}>
                Custom times require admin approval before confirmation.
              </div>
              {maxHours && (
                <div className="alert alert-info py-2 mb-3" style={{ fontSize: 13 }}>
                  Max booking duration: <strong>{formatDuration(maxHours)}</strong>
                </div>
              )}
              <div className="row g-2 mb-2">
                <div className="col-6">
                  <label className="form-label">Start</label>
                  <input className="form-control" type="datetime-local" value={freeStart}
                    onChange={e => setFreeStart(e.target.value)} />
                </div>
                <div className="col-6">
                  <label className="form-label">End</label>
                  <input className="form-control" type="datetime-local" value={freeEnd}
                    min={freeStart} onChange={e => setFreeEnd(e.target.value)} />
                </div>
              </div>
              {durationWarning && (
                <div className="alert alert-warning py-2 mb-2" style={{ fontSize: 13 }}>{durationWarning}</div>
              )}
            </>
          )}
        </>
      )}

      {/* Footer */}
      <hr className="mt-3" />
      <div className="d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-outline-secondary"
          onClick={() => { setStep(1); setSubmitError(''); }}>← Back</button>
        <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting…' : submitLabel}
        </button>
      </div>
    </>
  );
}
