'use client';

import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import FullCalendarComponent from '@fullcalendar/react';
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
  if (status === 'provisional') return 'transparent';
  return '#f59f00';
}

function fmt(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return value;
  }
}

export default function AdminCalendarClient({ resources = [], unavailabilityBlocks = [], initialView = 'timeGridWeek' }) {
  const [bookings, setBookings] = useState([]);
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [showBlocks, setShowBlocks] = useState(true);
  const [showProvisional, setShowProvisional] = useState(true);
  const [showCapacity, setShowCapacity] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState('');
  const [panelSuccess, setPanelSuccess] = useState('');
  const calendarRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [calendarTitle, setCalendarTitle] = useState('');
  const [activeView, setActiveView] = useState(initialView);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      const api = calendarRef.current?.getApi();
      if (api) setCalendarTitle(api.view.title);
    }
  }, [mounted]);
  
  const navigate = useCallback((action) => {
    const api = calendarRef.current?.getApi();
    if (!api) {
      setTimeout(() => {
        const retryApi = calendarRef.current?.getApi();
        if (retryApi) {
          if (action === 'prev') retryApi.prev();
          else if (action === 'next') retryApi.next();
          else if (action === 'today') retryApi.today();
          else retryApi.changeView(action);
        }
      }, 100);
      return;
    }
    if (action === 'prev') api.prev();
    else if (action === 'next') api.next();
    else if (action === 'today') api.today();
    else api.changeView(action);
  }, []);
  
  useEffect(() => {
    document.querySelectorAll('.cal-capacity-bar').forEach((el) => {
      el.style.display = showCapacity ? 'block' : 'none';
    });
  }, [showCapacity]);
  
  const handleBookingAction = useCallback(async (action, bookingId) => {
    setPanelLoading(true);
    setPanelError('');
    setPanelSuccess('');
    try {
      const res = await fetch(`/api/calendar/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPanelError(data.error || `Failed to ${action} booking.`);
      } else {
        setPanelSuccess(action === 'confirm' ? 'Booking confirmed.' : 'Booking cancelled.');
        setSelectedEvent((prev) => prev ? {
          ...prev,
          raw: { ...prev.raw, status: action === 'confirm' ? 'confirmed' : 'cancelled' }
        } : prev);
        const api = calendarRef.current?.getApi();
        if (api) {
          const info = api.currentDataManager?.getCurrentData()?.dateProfile;
          const range = api.view?.getCurrentData?.()?.dateProfile?.currentRange;
          const start = api.view?.currentStart;
          const end = api.view?.currentEnd;
          if (start && end) {
            const localDateStr = (d) =>
              d.getFullYear() + '-' +
              String(d.getMonth() + 1).padStart(2, '0') + '-' +
              String(d.getDate()).padStart(2, '0');
            fetch(`/api/bookings/list?per_page=100&date_from=${localDateStr(start)}&date_to=${localDateStr(end)}`)
              .then(r => r.ok ? r.json() : {})
              .then(d => setBookings(Array.isArray(d) ? d : (d.data || [])));
          }
        }
      }
    } catch {
      setPanelError(`Failed to ${action} booking.`);
    } finally {
      setPanelLoading(false);
    }
  }, []);
  
  const dailyCapacity = useMemo(() => {
    if (!showCapacity) return {};
    const counts = {};
    bookings
      .filter((row) => !selectedResourceId || row.resource_id === selectedResourceId)
      .forEach((row) => {
        const day = row.start_at ? row.start_at.slice(0, 10) : null;
        if (!day) return;
        counts[day] = (counts[day] || 0) + 1;
      });
    const capacity = selectedResourceId
      ? (resources.find((r) => r.id === selectedResourceId)?.capacity ?? null)
      : Math.min(...resources.map((r) => r.capacity ?? Infinity).filter((c) => c !== Infinity));
    return { counts, capacity: isFinite(capacity) ? capacity : null };
  }, [bookings, resources, selectedResourceId, showCapacity]);

  const events = useMemo(() => {
    const bookingEvents = bookings
      .filter((row) => !selectedResourceId || row.resource_id === selectedResourceId)
      .filter((row) => showProvisional || row.status !== 'provisional')
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

    const blockEvents = !showBlocks ? [] : unavailabilityBlocks
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
  }, [bookings, unavailabilityBlocks, selectedResourceId, showBlocks, showProvisional]);

  const badgeClass = (status) => {
    if (status === 'confirmed') return 'bg-green-lt';
    if (status === 'cancelled') return 'bg-red-lt';
    return 'bg-yellow-lt';
  };

  return (
    <>
      {/* Toolbar row */}
      <div className="d-flex align-items-center gap-2 mb-3">
        
        <select
          className="form-select form-select-sm"
          style={{ width: 'auto' }}
          value={selectedResourceId}
          onChange={(e) => setSelectedResourceId(e.target.value)}
        >
          <option value="">All resources</option>
          {resources.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>

        <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate('prev')}>&#8592;</button>
        <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate('today')}>Today</button>
        <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate('next')}>&#8594;</button>
        <span className="text-secondary" style={{ fontSize: '14px', fontWeight: 500 }}>{calendarTitle}</span>

        <div className="ms-auto d-flex gap-2">
          <button
            className={`btn btn-sm ${showBlocks ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setShowBlocks(!showBlocks)}
          >
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#d63939', marginRight: 5 }} />
            Blocks
          </button>
          <button
            className={`btn btn-sm ${showProvisional ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setShowProvisional(!showProvisional)}
          >
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#f59f00', marginRight: 5 }} />
            Provisional
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="row g-4">
        <div className={selectedEvent ? 'col-lg-8' : 'col-12'}>
          <div className="card">
            <div className="card-body p-0">
              {!mounted ? null : <FullCalendarComponent
              
                key={initialView}
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView={initialView}
                headerToolbar={false}
                slotMinTime="06:00:00"
                slotMaxTime="23:00:00"
                nowIndicator
                editable={false}
                selectable={false}
                height="auto"
                events={events}
                dayCellDidMount={(arg) => {
                  if (!showCapacity || dailyCapacity.capacity == null) return;
                  const localDateStr = (d) =>
                    d.getFullYear() + '-' +
                    String(d.getMonth() + 1).padStart(2, '0') + '-' +
                    String(d.getDate()).padStart(2, '0');
                  const day = localDateStr(arg.date);
                  const count = dailyCapacity.counts[day] || 0;
                  const ratio = count / dailyCapacity.capacity;
                  const color = ratio === 0 ? '#c0dd97' : ratio < 0.5 ? '#c0dd97' : ratio < 0.8 ? '#fac775' : '#f09595';
                  const bar = document.createElement('div');
                  bar.className = 'cal-capacity-bar';
                  bar.style.cssText = `position:absolute;bottom:0;left:0;right:0;height:3px;background:${color};pointer-events:none;`;
                  arg.el.style.position = 'relative';
                  arg.el.appendChild(bar);
                }}
                eventClassNames={(arg) => {
                  const raw = arg.event.extendedProps?.raw;
                  if (raw?.status === 'provisional') return ['provisional-event'];
                  return [];
                }}
                navLinkDayClick={(date) => {
                  const api = calendarRef.current?.getApi();
                  if (api) {
                    api.changeView('timeGridDay', date);
                    setCalendarTitle(api.view.title);
                  }
                }}
                navLinks={true}
                eventClick={(info) => {
                  const raw = info.event.extendedProps?.raw;
                  if (!raw) return;
                  setPanelError('');
                  setPanelSuccess('');
                  setSelectedEvent({ type: info.event.extendedProps.type, raw });
                }}
                datesSet={(info) => {
                  const api = calendarRef.current?.getApi();
                  if (api) {
                    setCalendarTitle(api.view.title);
                    const currentView = api.view.type;
                    setActiveView(currentView);
                    const url = new URL(window.location.href);
                    if (url.searchParams.get('view') !== currentView) {
                      url.searchParams.set('view', currentView);
                      window.history.replaceState({}, '', url.toString());
                      window.dispatchEvent(new CustomEvent('calendarViewChange', { detail: currentView }));
                    }
                  }
                  const localDateStr = (d) =>
                    d.getFullYear() + '-' +
                    String(d.getMonth() + 1).padStart(2, '0') + '-' +
                    String(d.getDate()).padStart(2, '0');
                  const from = localDateStr(info.start);
                  const to   = localDateStr(info.end);
                  fetch(`/api/bookings/list?per_page=100&date_from=${from}&date_to=${to}`)
                    .then(r => r.ok ? r.json() : {})
                    .then(data => setBookings(Array.isArray(data) ? data : (data.data || [])));
                }}
              />}
            </div>
          </div>
        </div>

        {selectedEvent && (
          <div className="col-lg-4">
            <div className="card">
              <div className="card-header d-flex align-items-center justify-content-between" style={{ backgroundColor: '#1e2a78', color: '#ffffff' }}>
                <h3 className="card-title mb-0" style={{ color: '#ffffff' }}>
                  {selectedEvent.type === 'unavailability' ? 'Unavailability block' : 'Booking details'}
                </h3>
                <button
                  className="btn btn-sm btn-outline-light"
                  onClick={() => { setSelectedEvent(null); setPanelError(''); setPanelSuccess(''); }}
                >
                  Close
                </button>
              </div>
              <div className="card-body">
                {panelError && <div className="alert alert-danger py-2">{panelError}</div>}
                {panelSuccess && <div className="alert alert-success py-2">{panelSuccess}</div>}

                {selectedEvent.type === 'booking' && (
                  <>
                    <dl className="row mb-0">
                      <dt className="col-sm-4">Status</dt>
                      <dd className="col-sm-8">
                        <span className={`badge ${badgeClass(selectedEvent.raw.status)}`}>{selectedEvent.raw.status}</span>
                      </dd>
                      <dt className="col-sm-4">Resource</dt>
                      <dd className="col-sm-8">{selectedEvent.raw.resource_name || '—'}</dd>
                      <dt className="col-sm-4">Customer</dt>
                      <dd className="col-sm-8">{selectedEvent.raw.customer_name || '—'}</dd>
                      <dt className="col-sm-4">Email</dt>
                      <dd className="col-sm-8">{selectedEvent.raw.customer_email || '—'}</dd>
                      <dt className="col-sm-4">Phone</dt>
                      <dd className="col-sm-8">{selectedEvent.raw.customer_phone || '—'}</dd>
                      <dt className="col-sm-4">Party size</dt>
                      <dd className="col-sm-8">{selectedEvent.raw.party_size || 1}</dd>
                      <dt className="col-sm-4">Start</dt>
                      <dd className="col-sm-8">{fmt(selectedEvent.raw.start_at)}</dd>
                      <dt className="col-sm-4">End</dt>
                      <dd className="col-sm-8">{fmt(selectedEvent.raw.end_at)}</dd>
                      <dt className="col-sm-4">Reference</dt>
                      <dd className="col-sm-8">{selectedEvent.raw.reference_code || '—'}</dd>
                      {selectedEvent.raw.notes && (
                        <>
                          <dt className="col-sm-4">Notes</dt>
                          <dd className="col-sm-8">{selectedEvent.raw.notes}</dd>
                        </>
                      )}
                    </dl>

                    <hr />

                    <div className="d-flex flex-column gap-2">
                      {selectedEvent.raw.status === 'provisional' && (
                        <button
                          className="btn btn-success"
                          disabled={panelLoading}
                          onClick={() => handleBookingAction('confirm', selectedEvent.raw.id)}
                        >
                          {panelLoading ? 'Confirming…' : 'Confirm booking'}
                        </button>
                      )}
                      <button
                        className="btn btn-danger"
                        disabled={panelLoading || selectedEvent.raw.status === 'cancelled'}
                        onClick={() => handleBookingAction('cancel', selectedEvent.raw.id)}
                      >
                        {panelLoading ? 'Cancelling…' : 'Cancel booking'}
                      </button>
                      <a
                        href={`/bookings?booking_id=${selectedEvent.raw.id}`}
                        className="btn btn-outline-secondary"
                      >
                        View in bookings
                      </a>
                    </div>
                  </>
                )}

                {selectedEvent.type === 'unavailability' && (
                  <>
                    <dl className="row mb-0">
                      <dt className="col-sm-4">Resource</dt>
                      <dd className="col-sm-8">{selectedEvent.raw.resource_name || '—'}</dd>
                      <dt className="col-sm-4">Start</dt>
                      <dd className="col-sm-8">{fmt(selectedEvent.raw.start_at)}</dd>
                      <dt className="col-sm-4">End</dt>
                      <dd className="col-sm-8">{fmt(selectedEvent.raw.end_at)}</dd>
                      {selectedEvent.raw.reason && (
                        <>
                          <dt className="col-sm-4">Reason</dt>
                          <dd className="col-sm-8">{selectedEvent.raw.reason}</dd>
                        </>
                      )}
                    </dl>
                    <hr />
                    <a               
                      href={`/resources?resource_id=${selectedEvent.raw.resource_id}&panel=unavailability`}
                      className="btn btn-outline-secondary"
                    >
                      Manage in resources
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
