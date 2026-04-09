'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatLocalInput(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Format a Date as "YYYY-MM-DD" using LOCAL date parts.
 * Never use toISOString() for this — it converts to UTC first, which shifts
 * the date backwards by one day in UTC+ timezones (e.g. BST = UTC+1).
 */
function localDateStr(date) {
  return (
    date.getFullYear() +
    '-' + String(date.getMonth() + 1).padStart(2, '0') +
    '-' + String(date.getDate()).padStart(2, '0')
  );
}

/**
 * Convert per_day array into a Set of closed date strings "YYYY-MM-DD"
 * A day is closed if is_open is false OR available_slots is 0 with no open free windows.
 */
function buildClosedDates(perDay) {
  const closed = new Set();
  for (const day of perDay || []) {
    if (!day.is_open || day.available_slots === 0) {
      closed.add(day.date);
    }
  }
  return closed;
}

/**
 * Build FullCalendar background events that grey out fully closed dates.
 */
function buildClosureBackgrounds(closedDates, rangeStart, rangeEnd) {
  const events = [];
  for (const date of closedDates) {
    // Only include dates within the fetched range
    if (date >= rangeStart && date <= rangeEnd) {
      events.push({
        id: `closed-${date}`,
        start: date,
        end: date,
        allDay: true,
        display: 'background',
        backgroundColor: '#f0f0f0',
        classNames: ['day-closed'],
      });
    }
  }
  return events;
}

/**
 * Convert slots array from the API into FullCalendar event objects.
 * Only shows available slots — blocked and fully booked are excluded from
 * the clickable events but kept as background indicators if blocked.
 */
function buildSlotEvents(slots) {
  const events = [];
  for (const slot of slots || []) {
    if (slot.blocked) {
      // Show blocked periods as a red background, not clickable
      events.push({
        id: `blocked-${slot.start_at}`,
        start: slot.start_at,
        end: slot.end_at,
        display: 'background',
        backgroundColor: '#ffd5d5',
        classNames: ['slot-blocked'],
      });
      continue;
    }

    if (!slot.is_available) {
      // Fully booked — show as a muted non-clickable event
      events.push({
        id: `full-${slot.start_at}`,
        title: 'Fully booked',
        start: slot.start_at,
        end: slot.end_at,
        backgroundColor: '#c8c8c8',
        borderColor: '#b0b0b0',
        textColor: '#555555',
        classNames: ['slot-full'],
        extendedProps: { type: 'full' },
      });
      continue;
    }

    // Available — clickable green slot
    const capacityLabel = slot.available_capacity > 1
      ? ` (${slot.available_capacity} left)`
      : '';

    events.push({
      id: `slot-${slot.start_at}`,
      title: `Available${capacityLabel}`,
      start: slot.start_at,
      end: slot.end_at,
      backgroundColor: '#2fb344',
      borderColor: '#2fb344',
      textColor: '#ffffff',
      classNames: ['slot-available'],
      extendedProps: { type: 'slot', slot },
    });
  }
  return events;
}

/**
 * For free-mode resources (no slots, just open windows), build open window
 * events so the user can see when the resource is bookable.
 */
function buildFreeWindowEvents(perDay, timezone) {
  // Free mode: the resolver returns one "free" slot per open window
  // This is already handled by buildSlotEvents above — this function is a no-op
  // kept as a hook for future differentiation if needed.
  return [];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PublicBookingCalendarClient({ resources = [], initialError = '' }) {
  const [resourceId, setResourceId] = useState(resources[0]?.id || '');
  const [events, setEvents] = useState([]);
  const [closedDates, setClosedDates] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError || '');
  const [selectedRange, setSelectedRange] = useState(null);
  const [hasRules, setHasRules] = useState(true); // assume true until we know otherwise

  const selectedResource = useMemo(
    () => resources.find((r) => r.id === resourceId) || null,
    [resources, resourceId]
  );

  // Date range for the fetch — today + 30 days
  const rangeFrom = useMemo(() => startOfDay(new Date()), []);
  const rangeTo   = useMemo(() => addDays(rangeFrom, 30), [rangeFrom]);
  // Use local date parts — toISOString() converts to UTC first, which shifts the
  // date back by one day in UTC+ timezones (e.g. BST), causing off-by-one errors.
  const rangeFromStr = useMemo(() => localDateStr(rangeFrom), [rangeFrom]);
  const rangeToStr   = useMemo(() => localDateStr(rangeTo),   [rangeTo]);

  useEffect(() => {
    if (!resourceId) {
      setEvents([]);
      setClosedDates(new Set());
      return;
    }

    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError('');
      const url = `/api/calendar/public-availability?resource_id=${encodeURIComponent(resourceId)}&from=${encodeURIComponent(rangeFromStr)}&to=${encodeURIComponent(rangeToStr)}`;
      try {
        const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
        const data = await response.json().catch(() => ({}));
        if (controller.signal.aborted) return;
        if (!response.ok) {
          setError(data?.error || 'Unable to load availability.');
          return;
        }
        setHasRules(data?.summary?.has_rules ?? true);
        const closed = buildClosedDates(data?.per_day);
        setClosedDates(closed);
        const slotEvents   = buildSlotEvents(data?.slots);
        const closureBgs   = buildClosureBackgrounds(closed, rangeFromStr, rangeToStr);
        const blockEvents  = (data?.unavailability_blocks || []).map((block) => ({
          id: `block-${block.id}`,
          start: block.start_at,
          end: block.end_at,
          display: 'background',
          backgroundColor: '#ffd5d5',
          classNames: ['block-unavailable'],
        }));
        setEvents([...closureBgs, ...blockEvents, ...slotEvents]);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError('Unable to load availability.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [resourceId, rangeFromStr, rangeToStr]);

  // Mirror the selected slot into the visible datetime-local inputs in the page.
  // Those inputs are rendered by the parent server component (book/page.jsx) and
  // carry `required`, so the browser blocks submission unless they have values.
  useEffect(() => {
    const startInput = document.querySelector('input[name="start_at_local"][type="datetime-local"]');
    const endInput   = document.querySelector('input[name="end_at_local"][type="datetime-local"]');
    if (startInput) startInput.value = selectedRange?.start || '';
    if (endInput)   endInput.value   = selectedRange?.end   || '';
  }, [selectedRange]);

  // Prevent clicking on non-available events
  const handleEventClick = useCallback((info) => {
    const { type, slot } = info.event.extendedProps || {};
    if (type !== 'slot' || !slot) return;

    setSelectedRange({
      start: formatLocalInput(new Date(slot.start_at)),
      end:   formatLocalInput(new Date(slot.end_at)),
    });
  }, []);

  // Determine what the calendar should display to the user
  const statusMessage = useMemo(() => {
    if (loading) return null;
    if (error) return null;
    if (!resourceId) return null;
    if (!hasRules) return { type: 'warning', text: 'This resource has no availability schedule configured yet.' };
    if (!selectedRange) return { type: 'info', text: 'Click an available slot on the calendar to select it.' };
    return null;
  }, [loading, error, resourceId, hasRules, selectedRange]);

  return (
    <>
      {/* Resource selector */}
      <div className="mb-3">
        <label className="form-label">Resource</label>
        <select
          name="resource_id"
          className="form-select"
          required
          value={resourceId}
          onChange={(e) => {
            setResourceId(e.target.value);
            setSelectedRange(null);
          }}
        >
          <option value="">Select a resource</option>
          {resources.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} (capacity: {r.capacity})
            </option>
          ))}
        </select>
      </div>

      {/* Hidden inputs — populated when a slot is clicked */}
      <input type="hidden" name="start_at_local" value={selectedRange?.start || ''} />
      <input type="hidden" name="end_at_local"   value={selectedRange?.end   || ''} />

      {/* Status messages */}
      {error         ? <div className="alert alert-danger">{error}</div> : null}
      {loading       ? <div className="alert alert-secondary">Loading availability…</div> : null}
      {statusMessage ? <div className={`alert alert-${statusMessage.type}`}>{statusMessage.text}</div> : null}

      {/* Selected slot confirmation */}
      {selectedRange ? (
        <div className="alert alert-success d-flex justify-content-between align-items-center">
          <span>
            Selected: <strong>{selectedRange.start.replace('T', ' ')}</strong>
            {' → '}
            <strong>{selectedRange.end.replace('T', ' ')}</strong>
            {selectedResource ? ` · ${selectedResource.name}` : ''}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setSelectedRange(null)}
          >
            Clear
          </button>
        </div>
      ) : null}

      {/* Calendar */}
      <div className="card mb-4">
        <div className="card-body p-0">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            initialDate={rangeFrom}
            validRange={{ start: rangeFromStr, end: rangeToStr }}
            headerToolbar={{
              left:   'prev,next today',
              center: 'title',
              right:  'timeGridWeek,timeGridDay',
            }}
            slotMinTime="06:00:00"
            slotMaxTime="23:00:00"
            selectable={false}
            editable={false}
            nowIndicator
            height="auto"
            eventClick={handleEventClick}
            eventCursor="pointer"
            events={events}
            // Style closed-day columns visibly greyed out in day/week view
            dayCellClassNames={(arg) => {
              const dateStr = localDateStr(arg.date);
              return closedDates.has(dateStr) ? ['day-unavailable'] : [];
            }}
          />
        </div>
      </div>

      {/* Legend */}
      {resourceId && !loading ? (
        <div className="d-flex gap-3 mb-3 flex-wrap">
          <span className="d-flex align-items-center gap-1">
            <span style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#2fb344', display: 'inline-block' }} />
            <small className="text-secondary">Available</small>
          </span>
          <span className="d-flex align-items-center gap-1">
            <span style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#c8c8c8', display: 'inline-block' }} />
            <small className="text-secondary">Fully booked</small>
          </span>
          <span className="d-flex align-items-center gap-1">
            <span style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#ffd5d5', display: 'inline-block' }} />
            <small className="text-secondary">Unavailable</small>
          </span>
          <span className="d-flex align-items-center gap-1">
            <span style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#f0f0f0', border: '1px solid #ddd', display: 'inline-block' }} />
            <small className="text-secondary">Closed</small>
          </span>
        </div>
      ) : null}
    </>
  );
}
