'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Ring from './Ring';

const FullCalendarNoSSR = dynamic(() => import('./FullCalendarNoSSR'), { ssr: false });

function toIso(value) {
  if (!value) return null;
  try { return new Date(value).toISOString(); } catch { return null; }
}

function bookingColor(status) {
  if (status === 'confirmed') return '#1f8a5b';
  if (status === 'cancelled') return '#d63939';
  return '#d97706';
}

function bookingBg(status) {
  if (status === 'confirmed') return 'oklch(0.95 0.04 155)';
  if (status === 'cancelled') return 'oklch(0.96 0.03 25)';
  return 'oklch(0.96 0.04 80)';
}

function formatMonthYear(date) {
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export default function DashboardCalendarClient({
  unavailabilityBlocks = [],
  resources = [],
  availabilityRulesByResource = {},
  showResourceSelector = true,
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [calApi,       setCalApi]       = useState(null);
  const [monthLabel,   setMonthLabel]   = useState(() => formatMonthYear(new Date()));
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [bookings,     setBookings]     = useState([]);
  const [utilDays,     setUtilDays]     = useState({});

  // ── Selected day display ─────────────────────────────────────
  const selectedDateLabel = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    return {
      weekday: d.toLocaleDateString('en-GB', { weekday: 'long' }),
      date:    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }),
    };
  }, [selectedDate]);

  const selectedBookings = useMemo(() =>
    bookings
      .filter(b => b.status !== 'cancelled' && b.start_at?.slice(0, 10) === selectedDate)
      .sort((a, b) => new Date(a.start_at) - new Date(b.start_at)),
    [bookings, selectedDate]
  );

  const confirmedCount  = selectedBookings.filter(b => b.status === 'confirmed').length;
  const pendingCount    = selectedBookings.filter(b => b.status === 'provisional').length;
  const totalCount      = selectedBookings.length;

  // Ring value — bookings on selected day relative to month max
  const dailyCounts = useMemo(() => {
    const map = {};
    for (const b of bookings) {
      if (b.status === 'cancelled') continue;
      const d = b.start_at?.slice(0, 10);
      if (d) map[d] = (map[d] || 0) + 1;
    }
    return map;
  }, [bookings]);

  const utilDay  = utilDays[selectedDate];
  const dayPct   = utilDay?.pct ?? 0;
  const ringTone = dayPct >= 0.9 ? 'full' : dayPct >= 0.6 ? 'warn' : 'ok';

  // ── Calendar events ──────────────────────────────────────────
  const events = useMemo(() => {
    const bookingEvents = bookings.map(row => ({
      id:              `booking-${row.id}`,
      title:           row.customer_name || 'Booking',
      start:           toIso(row.start_at),
      end:             toIso(row.end_at),
      backgroundColor: bookingColor(row.status),
      borderColor:     bookingColor(row.status),
      textColor:       '#ffffff',
      url:             `/bookings?booking_id=${row.id}`,
    }));

    const blockEvents = unavailabilityBlocks.map(row => ({
      id:              `block-${row.id}`,
      title:           `${row.resource_name || 'Resource'} unavailable`,
      start:           toIso(row.start_at),
      end:             toIso(row.end_at),
      backgroundColor: '#868e96',
      borderColor:     '#868e96',
      textColor:       '#ffffff',
    }));

    return [...bookingEvents, ...blockEvents].filter(e => e.start && e.end);
  }, [bookings, unavailabilityBlocks]);

  function handlePrev()  { calApi?.prev(); }
  function handleNext()  { calApi?.next(); }
  function handleToday() { calApi?.today(); setSelectedDate(todayStr); }

  return (
    <>
      <style>{`
        /* FullCalendar overrides — Availio design system */
        .av-cal .fc { font-family: var(--av-font-mono), monospace; }
        .av-cal .fc-daygrid-day { cursor: pointer; }
        .av-cal .fc-daygrid-day:hover .fc-daygrid-day-frame {
          background: oklch(0.97 0.01 250);
        }
        .av-cal .fc-day-today .fc-daygrid-day-frame {
          background: oklch(0.96 0.03 250) !important;
        }
        .av-cal .fc-day-selected .fc-daygrid-day-frame {
          background: oklch(0.93 0.04 250) !important;
          outline: 2px solid var(--av-main);
          outline-offset: -2px;
          border-radius: 4px;
        }
        .av-cal .fc-col-header-cell {
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: .12em;
          color: var(--av-ink-3);
          padding: 8px 0;
          background: var(--av-paper-2);
          border-bottom: 1px solid var(--av-line) !important;
        }
        .av-cal .fc-col-header-cell a { color: inherit !important; text-decoration: none; }
        .av-cal .fc-daygrid-day-number {
          font-size: 12px;
          color: var(--av-ink-2);
          padding: 4px 6px;
          font-family: var(--av-font-mono);
        }
        .av-cal .fc-day-today .fc-daygrid-day-number {
          color: var(--av-main);
          font-weight: 700;
        }
        .av-cal .fc-daygrid-event {
          font-size: 11px;
          border-radius: 4px;
          padding: 1px 4px;
          font-family: var(--av-font-mono);
        }
        .av-cal .fc-event-title { font-weight: 500; }
        .av-cal .fc-daygrid-day-frame { min-height: 80px; }
        .av-cal .fc-scrollgrid { border: none !important; }
        .av-cal .fc-scrollgrid td, .av-cal .fc-scrollgrid th { border-color: var(--av-line) !important; }
        .av-cal .fc-toolbar { display: none; }
      `}</style>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: 14,
        marginBottom: 18,
      }}>

        {/* ── Calendar panel ── */}
        <div style={{
          minWidth: 0,
          background: '#fff',
          border: '1px solid var(--av-line)',
          borderRadius: 'var(--av-r-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--av-shadow-sm)',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--av-line)',
            background: '#fff',
          }}>
            <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--av-ink)', letterSpacing: '-.01em' }}>
              {monthLabel}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={handlePrev} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--av-line)', background: '#fff', color: 'var(--av-ink-2)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
              </button>
              <button onClick={handleToday} style={{ height: 28, padding: '0 10px', borderRadius: 6, border: '1px solid var(--av-line)', background: '#fff', color: 'var(--av-ink-2)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                Today
              </button>
              <button onClick={handleNext} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--av-line)', background: '#fff', color: 'var(--av-ink-2)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
              </button>
            </div>
          </div>

          {/* FullCalendar */}
          <div className="av-cal" style={{ padding: '0 0 4px' }}>
            <FullCalendarNoSSR
              initialView="dayGridMonth"
              headerToolbar={false}
              eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
              height="auto"
              events={events}
              dateClick={(info) => setSelectedDate(info.dateStr)}
              dayCellClassNames={(arg) => arg.dateStr === selectedDate ? ['fc-day-selected'] : []}
              datesSet={(info) => {
                setCalApi(info.view.calendar);
                const mid = new Date((info.start.getTime() + info.end.getTime()) / 2);
                setMonthLabel(formatMonthYear(mid));
                const from = info.start.toISOString().slice(0, 10);
                const to   = info.end.toISOString().slice(0, 10);
                fetch(`/api/bookings/list?per_page=200&date_from=${from}&date_to=${to}`)
                  .then(r => r.ok ? r.json() : {})
                  .then(data => setBookings(Array.isArray(data) ? data : (data.data || [])));
                fetch(`/api/analytics/utilisation?date_from=${from}&date_to=${to}`)
                  .then(r => r.ok ? r.json() : {})
                  .then(data => {
                    const map = {};
                    for (const d of (data.days || [])) map[d.date] = d;
                    setUtilDays(map);
                  });
              }}
            />
          </div>
        </div>

        {/* ── Day rail ── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--av-paper-2)',
          border: '1px solid var(--av-line)',
          borderRadius: 'var(--av-r-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--av-shadow-sm)',
        }}>
          {/* Day rail header */}
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--av-line)', background: '#fff' }}>
            <div style={{ fontFamily: 'var(--av-font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--av-ink-3)', marginBottom: 8 }}>
              Selected day
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Ring value={dayPct} size={52} stroke={5} tone={totalCount === 0 ? '' : ringTone} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--av-ink)', lineHeight: 1.2 }}>
                  {selectedDateLabel.weekday}
                </div>
                <div style={{ fontFamily: 'var(--av-font-mono)', fontSize: 11, color: 'var(--av-ink-3)', marginTop: 2 }}>
                  {selectedDateLabel.date}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 10 }}>
            {[
              ['Bookings', totalCount],
              ['Confirmed', confirmedCount],
              ['Capacity', utilDay ? `${utilDay.booked}/${utilDay.max_capacity}` : '—'],
            ].map(([label, val]) => (
                <div key={label} style={{ textAlign: 'center', background: 'var(--av-paper-2)', borderRadius: 7, padding: '5px 4px', border: '1px solid var(--av-line)' }}>
                  <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--av-ink)', lineHeight: 1 }}>{val}</div>
                  <div style={{ fontFamily: 'var(--av-font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--av-ink-4)', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Booking list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {selectedBookings.length === 0 ? (
              <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--av-ink-4)', fontSize: 12, fontFamily: 'var(--av-font-mono)' }}>
                No bookings
              </div>
            ) : selectedBookings.map(b => {
              const time = new Date(b.start_at).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
              const end  = new Date(b.end_at).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
              return (
                <a key={b.id} href={`/bookings?booking_id=${b.id}`} style={{ display: 'block', textDecoration: 'none', padding: '8px 12px', borderBottom: '1px solid var(--av-line)', background: bookingBg(b.status) }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--av-ink)' }}>{b.customer_name || 'Booking'}</span>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: bookingColor(b.status), flexShrink: 0 }} />
                  </div>
                  <div style={{ fontFamily: 'var(--av-font-mono)', fontSize: 10, color: 'var(--av-ink-3)' }}>
                    {time} · {end}
                  </div>
                  {b.event_type_name && (
                    <div style={{ fontFamily: 'var(--av-font-mono)', fontSize: 10, color: 'var(--av-ink-4)', marginTop: 2 }}>
                      {b.event_type_name}
                    </div>
                  )}
                </a>
              );
            })}
          </div>

          {/* Footer */}
          {selectedDate !== todayStr && (
            <div style={{ padding: '8px 12px', borderTop: '1px solid var(--av-line)', background: '#fff' }}>
              <button onClick={() => setSelectedDate(todayStr)} style={{ width: '100%', padding: '6px', borderRadius: 7, border: '1px solid var(--av-line)', background: '#fff', color: 'var(--av-ink-3)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--av-font-mono)' }}>
                ← Back to today
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
