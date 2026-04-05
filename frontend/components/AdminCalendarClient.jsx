'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });

import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

function toIso(value) {
  if (!value) return null;
  try {
    return new Date(value).toISOString();
  } catch {
    return null;
  }
}

function bookingColor(status) {
  if (status === 'confirmed') return '#2fb344';
  if (status === 'cancelled') return '#868e96';
  return '#f59f00';
}

export default function AdminCalendarClient({ resources = [], bookings = [], unavailabilityBlocks = [] }) {
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const events = useMemo(() => {
    const bookingEvents = bookings
      .filter((row) => !selectedResourceId || row.resource_id === selectedResourceId)
      .map((row) => ({
        id: `booking-${row.id}`,
        title: `${row.resource_name || 'Resource'} - ${row.customer_name || 'Booking'} (${row.status})`,
        start: toIso(row.start_at),
        end: toIso(row.end_at),
        backgroundColor: bookingColor(row.status),
        borderColor: bookingColor(row.status),
        textColor: '#ffffff',
        extendedProps: {
          type: 'booking',
          raw: row
        }
      }));

    const blockEvents = unavailabilityBlocks
      .filter((row) => !selectedResourceId || row.resource_id === selectedResourceId)
      .map((row) => ({
        id: `block-${row.id}`,
        title: `${row.resource_name || 'Resource'} unavailable${row.reason ? ` - ${row.reason}` : ''}`,
        start: toIso(row.start_at),
        end: toIso(row.end_at),
        backgroundColor: '#d63939',
        borderColor: '#d63939',
        textColor: '#ffffff',
        extendedProps: {
          type: 'unavailability',
          raw: row
        }
      }));

    return [...bookingEvents, ...blockEvents].filter((item) => item.start && item.end);
  }, [bookings, unavailabilityBlocks, selectedResourceId]);

  return (
    <div className="row g-4">
      <div className="col-lg-9">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center gap-3 flex-wrap">
            <h3 className="card-title mb-0">Calendar</h3>
            <div style={{ minWidth: 260 }}>
              <label className="form-label mb-1">Filter by resource</label>
              <select
                className="form-select"
                value={selectedResourceId}
                onChange={(event) => setSelectedResourceId(event.target.value)}
              >
                <option value="">All resources</option>
                {resources.map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="card-body">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              slotMinTime="06:00:00"
              slotMaxTime="23:00:00"
              nowIndicator
              editable={false}
              selectable={false}
              height="auto"
              eventClick={(info) => setSelectedEvent(info.event.extendedProps)}
              events={events}
            />
          </div>
        </div>
      </div>
      <div className="col-lg-3">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title mb-0">Details</h3>
          </div>
          <div className="card-body">
            {!selectedEvent ? (
              <p className="text-secondary mb-0">Click a booking or unavailability block to view details.</p>
            ) : selectedEvent.type === 'booking' ? (
              <div>
                <div className="mb-2"><strong>Status:</strong> {selectedEvent.raw.status}</div>
                <div className="mb-2"><strong>Resource:</strong> {selectedEvent.raw.resource_name || '—'}</div>
                <div className="mb-2"><strong>Customer:</strong> {selectedEvent.raw.customer_name || '—'}</div>
                <div className="mb-2"><strong>Email:</strong> {selectedEvent.raw.customer_email || '—'}</div>
                <div className="mb-2"><strong>Start:</strong> {selectedEvent.raw.start_at}</div>
                <div className="mb-2"><strong>End:</strong> {selectedEvent.raw.end_at}</div>
                <div className="mb-2"><strong>Party size:</strong> {selectedEvent.raw.party_size || 1}</div>
                <div className="mb-3"><strong>Notes:</strong> {selectedEvent.raw.notes || '—'}</div>
                <div className="d-grid gap-2">
                  <a className="btn btn-primary" href={`/bookings?booking_id=${selectedEvent.raw.id}`}>Open booking</a>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-2"><strong>Resource:</strong> {selectedEvent.raw.resource_name || '—'}</div>
                <div className="mb-2"><strong>Start:</strong> {selectedEvent.raw.start_at}</div>
                <div className="mb-2"><strong>End:</strong> {selectedEvent.raw.end_at}</div>
                <div className="mb-2"><strong>Reason:</strong> {selectedEvent.raw.reason || '—'}</div>
                <div className="d-grid gap-2">
                  <a className="btn btn-outline-primary" href="/unavailability-blocks">Manage unavailability</a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
