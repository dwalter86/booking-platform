'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });

import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

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

export default function PublicBookingCalendarClient({ resources = [], initialError = '' }) {
  const [resourceId, setResourceId] = useState(resources[0]?.id || '');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError || '');
  const [selectedRange, setSelectedRange] = useState(null);

  const selectedResource = useMemo(() => resources.find((item) => item.id === resourceId) || null, [resources, resourceId]);

  useEffect(() => {
    let cancelled = false;
    async function loadAvailability() {
      if (!resourceId) {
        setEvents([]);
        return;
      }

      setLoading(true);
      setError('');
      const from = startOfDay(new Date());
      const to = addDays(from, 14);
      const url = `/api/calendar/public-availability?resource_id=${encodeURIComponent(resourceId)}&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;

      try {
        const response = await fetch(url, { cache: 'no-store' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (!cancelled) setError(data?.error || 'Unable to load availability.');
          return;
        }

        const nextEvents = [];
        for (const slot of data?.slots || []) {
          nextEvents.push({
            id: `slot-${slot.start_at}`,
            title: `Available${slot.remaining_capacity ? ` (${slot.remaining_capacity} left)` : ''}`,
            start: slot.start_at,
            end: slot.end_at,
            backgroundColor: '#2fb344',
            borderColor: '#2fb344',
            textColor: '#ffffff',
            extendedProps: { type: 'slot', slot }
          });
        }
        for (const block of data?.unavailability_blocks || []) {
          nextEvents.push({
            id: `block-${block.id}`,
            title: `Unavailable${block.reason ? ` - ${block.reason}` : ''}`,
            start: block.start_at,
            end: block.end_at,
            backgroundColor: '#d63939',
            borderColor: '#d63939',
            textColor: '#ffffff',
            extendedProps: { type: 'block', block }
          });
        }
        if (!cancelled) setEvents(nextEvents);
      } catch {
        if (!cancelled) setError('Unable to load availability.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAvailability();
    return () => {
      cancelled = true;
    };
  }, [resourceId]);

  return (
    <>
      <div className="mb-3">
        <label className="form-label">Resource</label>
        <select
          name="resource_id"
          className="form-select"
          required
          value={resourceId}
          onChange={(event) => {
            setResourceId(event.target.value);
            setSelectedRange(null);
          }}
        >
          <option value="">Select a resource</option>
          {resources.map((resource) => (
            <option key={resource.id} value={resource.id}>
              {resource.name} (capacity: {resource.capacity})
            </option>
          ))}
        </select>
      </div>

      <input type="hidden" name="start_at_local" value={selectedRange?.start || ''} />
      <input type="hidden" name="end_at_local" value={selectedRange?.end || ''} />

      {error ? <div className="alert alert-danger">{error}</div> : null}
      {loading ? <div className="alert alert-secondary">Loading availability…</div> : null}
      {!loading && !error && !selectedRange ? <div className="alert alert-info">Select an available slot from the calendar below.</div> : null}
      {selectedRange ? (
        <div className="alert alert-success">
          Selected slot for {selectedResource?.name || 'resource'}: <strong>{selectedRange.start}</strong> to <strong>{selectedRange.end}</strong>
        </div>
      ) : null}

      <div className="card mb-4">
        <div className="card-body">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridWeek,timeGridDay'
            }}
            slotMinTime="06:00:00"
            slotMaxTime="23:00:00"
            selectable={false}
            editable={false}
            nowIndicator
            height="auto"
            eventClick={(info) => {
              const slot = info.event.extendedProps?.slot;
              if (!slot) return;
              setSelectedRange({
                start: formatLocalInput(new Date(slot.start_at)),
                end: formatLocalInput(new Date(slot.end_at))
              });
            }}
            events={events}
          />
        </div>
      </div>
    </>
  );
}
