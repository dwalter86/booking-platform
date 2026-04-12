'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

const FullCalendarNoSSR = dynamic(() => import('./FullCalendarNoSSR'), { ssr: false });

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

function formatDateRange(start, endExclusive) {
  const end = new Date(endExclusive);
  end.setDate(end.getDate() - 1);
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startStr} – ${endStr}`;
}

function computeInitialRange() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 21);
  return formatDateRange(start, end);
}

export default function DashboardCalendarClient({ bookings = [], unavailabilityBlocks = [] }) {
  const [calApi, setCalApi] = useState(null);
  const [dateRangeLabel, setDateRangeLabel] = useState(computeInitialRange);

  const events = useMemo(() => {
    const bookingEvents = bookings.map((row) => ({
      id: `booking-${row.id}`,
      title: `${row.resource_name || 'Resource'} - ${row.customer_name || 'Booking'}`,
      start: toIso(row.start_at),
      end: toIso(row.end_at),
      backgroundColor: bookingColor(row.status),
      borderColor: bookingColor(row.status),
      textColor: '#ffffff',
      url: `/bookings?booking_id=${row.id}`,
    }));

    const blockEvents = unavailabilityBlocks.map((row) => ({
      id: `block-${row.id}`,
      title: `${row.resource_name || 'Resource'} unavailable${row.reason ? ` - ${row.reason}` : ''}`,
      start: toIso(row.start_at),
      end: toIso(row.end_at),
      backgroundColor: '#d63939',
      borderColor: '#d63939',
      textColor: '#ffffff',
    }));

    return [...bookingEvents, ...blockEvents].filter((item) => item.start && item.end);
  }, [bookings, unavailabilityBlocks]);

  function handlePrev()  { calApi?.prev(); }
  function handleNext()  { calApi?.next(); }
  function handleToday() { calApi?.today(); }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title mb-0">
          Bookings Calendar{dateRangeLabel ? ` - ${dateRangeLabel}` : ''}
        </h3>
        <div className="card-options">
          <div className="btn-group">
            <button className="btn btn-sm btn-outline-secondary" onClick={handlePrev} aria-label="Previous">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M15 6l-6 6l6 6" />
              </svg>
            </button>
            <button className="btn btn-sm btn-outline-secondary" onClick={handleToday}>Today</button>
            <button className="btn btn-sm btn-outline-secondary" onClick={handleNext} aria-label="Next">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M9 6l6 6l-6 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div className="card-body">
        <FullCalendarNoSSR
          initialView="dayGridThreeWeeks"
          views={{
            dayGridThreeWeeks: {
              type: 'dayGrid',
              duration: { weeks: 3 },
            },
          }}
          headerToolbar={false}
          height="auto"
          events={events}
          datesSet={(info) => {
            setCalApi(info.view.calendar);
            setDateRangeLabel(formatDateRange(info.start, info.end));
          }}
        />
      </div>
    </div>
  );
}
