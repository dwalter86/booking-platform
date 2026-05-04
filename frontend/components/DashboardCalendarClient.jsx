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
  const startStr = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const endStr = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function computeInitialRange() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 21);
  return formatDateRange(start, end);
}

function toMins(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function getSlotsForDay(rules, dateStr) {
  const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();
  return rules
    .filter(r => r.day_of_week === dayOfWeek && r.is_open && r.slot_duration_minutes)
    .reduce((total, rule) => {
      const interval = rule.slot_interval_minutes || rule.slot_duration_minutes;
      return total + Math.floor((toMins(rule.end_time) - toMins(rule.start_time)) / interval);
    }, 0);
}

function DonutChart({ count, capacity }) {
  const r = 26;
  const cx = 36;
  const cy = 36;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * r;
  const ratio = capacity > 0 ? Math.min(count / capacity, 1) : 0;
  const filled = ratio * circumference;

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e2a78" strokeWidth={strokeWidth} />
      {filled > 0 && (
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#4ea8ff"
          strokeWidth={strokeWidth}
          strokeDasharray={`${filled} ${circumference}`}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      )}
    </svg>
  );
}


export default function DashboardCalendarClient({ unavailabilityBlocks = [], resources = [], availabilityRulesByResource = {}, showResourceSelector = true }) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [calApi, setCalApi] = useState(null);
  const [dateRangeLabel, setDateRangeLabel] = useState(computeInitialRange);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [bookings, setBookings] = useState([]);

  const selectedDateLabel = useMemo(() => {
    return new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
  }, [selectedDate]);

  const bookingsByResource = useMemo(() => {
    const startMap = {};    // availability_only: booking starts on selected date
    const overlapMap = {};  // free/hybrid: booking overlaps selected date
    for (const b of bookings) {
      const startDate = b.start_at?.slice(0, 10);
      const endDate   = b.end_at?.slice(0, 10);
      if (startDate === selectedDate) {
        startMap[b.resource_id] = (startMap[b.resource_id] || 0) + 1;
      }
      if (startDate <= selectedDate && endDate >= selectedDate) {
        overlapMap[b.resource_id] = (overlapMap[b.resource_id] || 0) + 1;
      }
    }
    return { startMap, overlapMap };
  }, [bookings, selectedDate]);

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
    <>
      <style>{`
        .fc-daygrid-day { cursor: pointer; }
        .fc-daygrid-day:hover .fc-daygrid-day-frame { background-color: rgba(78, 168, 255, 0.07); }
        .fc-daygrid-day.fc-day-selected .fc-daygrid-day-frame { background-color: rgba(78, 168, 255, 0.15); }
      `}</style>

      <div className="card mb-4">
        <div className="card-header" style={{ backgroundColor: '#1e2a78', color: '#ffffff' }}>
          <h3 className="card-title mb-0" style={{ color: '#ffffff' }}>
            Bookings Calendar{dateRangeLabel ? ` - ${dateRangeLabel}` : ''}
          </h3>
          <div className="card-options">
            <div className="btn-group">
              <button className="btn btn-sm" style={{ color: '#ffffff', borderColor: '#ffffff', backgroundColor: 'transparent' }} onClick={handlePrev} aria-label="Previous">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                  <path d="M15 6l-6 6l6 6" />
                </svg>
              </button>
              <button className="btn btn-sm" style={{ color: '#ffffff', borderColor: '#ffffff', backgroundColor: 'transparent' }} onClick={handleToday}>Today</button>
              <button className="btn btn-sm" style={{ color: '#ffffff', borderColor: '#ffffff', backgroundColor: 'transparent' }} onClick={handleNext} aria-label="Next">
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
            dateClick={(info) => setSelectedDate(info.dateStr)}
            dayCellClassNames={(arg) => arg.dateStr === selectedDate ? ['fc-day-selected'] : []}
            datesSet={(info) => {
              setCalApi(info.view.calendar);
              setDateRangeLabel(formatDateRange(info.start, info.end));
              const from = info.start.toISOString().slice(0, 10);
              const to   = info.end.toISOString().slice(0, 10);
              fetch(`/api/bookings/list?per_page=100&date_from=${from}&date_to=${to}`)
                .then(r => r.ok ? r.json() : {})
                .then(data => setBookings(Array.isArray(data) ? data : (data.data || [])));
            }}
          />
        </div>
      </div>

      {resources.length > 0 && (
        <>
          {showResourceSelector && <div className="text-secondary small mb-2">
            Showing bookings for <strong>{selectedDateLabel}</strong>
            {selectedDate !== todayStr && (
              <button
                className="btn btn-link btn-sm p-0 ms-2"
                onClick={() => setSelectedDate(todayStr)}
              >
                Back to today
              </button>
            )}
          </div>}
          {showResourceSelector && (
          <div className="d-flex gap-3 mb-4" style={{ overflowX: 'auto', paddingBottom: '4px' }}>
            {resources.map((resource) => {
              const isAvailabilityOnly = resource.booking_mode === 'availability_only';
              const count = isAvailabilityOnly
                ? (bookingsByResource.startMap[resource.id] || 0)
                : (bookingsByResource.overlapMap[resource.id] || 0);
              const capacity = isAvailabilityOnly
                ? getSlotsForDay(availabilityRulesByResource[resource.id] || [], selectedDate) * (resource.capacity || 1)
                : (resource.capacity || 0);
              return (
                <a
                  key={resource.id}
                  href={`/bookings?resource_id=${resource.id}&date_from=${selectedDate}&date_to=${selectedDate}&filter=1`}
                  className="text-decoration-none"
                  style={{ flexShrink: 0 }}
                >
                  <div className="card mb-0" style={{ minWidth: '210px' }}>
                    <div className="card-body d-flex align-items-center gap-3">
                      <DonutChart count={count} capacity={capacity} />
                      <div style={{ minWidth: 0 }}>
                        <div className="fw-medium text-truncate mb-1">
                          {resource.name}
                        </div>
                        <div className="d-flex align-items-baseline gap-1">
                          <div className="h2 mb-0">{count}</div>
                          {capacity > 0 && <div className="text-secondary small">/ {capacity}</div>}
                        </div>
                        <div className="text-secondary small">capacity</div>
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
          )}
        </>
      )}
    </>
  );
}
