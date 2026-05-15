'use client';

import { useMemo } from 'react';

function avatarColor(name) {
  const palette = ['#1e2a78', '#7c3aed', '#dc7a3a', '#1f8a5b', '#2d8cff', '#b83280'];
  if (!name) return palette[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

// Convert an ISO string to "YYYY-MM-DDTHH:MM" for datetime-local inputs.
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  // datetime-local uses local time
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function BookingPanelEdit({
  booking,
  form,
  setF,
  resources = [],
  eventTypes = [],
}) {
  // Event types are scoped per resource; filter to the currently selected resource.
  // If the booking has an event_type_id from a resource we don't show, keep it visible
  // so we don't accidentally hide the user's existing selection.
  const filteredEventTypes = useMemo(() => {
    const forCurrent = eventTypes.filter((et) => et.resource_id === form.resource_id);
    if (form.event_type_id && !forCurrent.some((et) => et.id === form.event_type_id)) {
      const existing = eventTypes.find((et) => et.id === form.event_type_id);
      if (existing) return [existing, ...forCurrent];
    }
    return forCurrent;
  }, [eventTypes, form.resource_id, form.event_type_id]);

  return (
    <>
      {/* CUSTOMER */}
      <div className="bp-section">
        <div className="bp-section-head"><h4>Customer</h4></div>
        <div className="bp-fld">
          <label htmlFor="ed-name">Full name <span className="bp-fld-req">*</span></label>
          <input
            id="ed-name"
            name="customer_name"
            type="text"
            required
            value={form.customer_name}
            onChange={(e) => setF('customer_name', e.target.value)}
          />
        </div>
        <div className="bp-fld-row">
          <div className="bp-fld">
            <label htmlFor="ed-email">Email</label>
            <input
              id="ed-email"
              name="customer_email"
              type="email"
              value={form.customer_email}
              onChange={(e) => setF('customer_email', e.target.value)}
            />
          </div>
          <div className="bp-fld">
            <label htmlFor="ed-phone">Phone</label>
            <input
              id="ed-phone"
              name="customer_phone"
              type="tel"
              placeholder="Optional"
              value={form.customer_phone}
              onChange={(e) => setF('customer_phone', e.target.value)}
            />
          </div>
        </div>
        <div className="bp-fld" style={{ maxWidth: 140 }}>
          <label htmlFor="ed-party">Party size</label>
          <input
            id="ed-party"
            name="party_size"
            type="number"
            min="1"
            max="50"
            value={form.party_size}
            onChange={(e) => setF('party_size', Math.max(1, parseInt(e.target.value, 10) || 1))}
          />
        </div>
      </div>

      {/* RESOURCE */}
      <div className="bp-section">
        <div className="bp-section-head"><h4>Resource</h4></div>
        <input type="hidden" name="resource_id" value={form.resource_id || ''} />
        <div className="bp-res-pick">
          {resources.length === 0 ? (
            <div className="bp-note-empty">No resources available.</div>
          ) : resources.map((r) => {
            const isOn = form.resource_id === r.id;
            return (
              <div
                key={r.id}
                className={`bp-res-pick-row${isOn ? ' on' : ''}`}
                onClick={() => setF('resource_id', r.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setF('resource_id', r.id); }}
              >
                <div
                  style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: avatarColor(r.name),
                    display: 'grid', placeItems: 'center',
                    color: '#fff', fontWeight: 700, fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  {r.name?.slice(0, 2).toUpperCase() || '??'}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="bp-rp-name">{r.name}</div>
                  <div className="bp-rp-sub">
                    Capacity {r.capacity || 1}
                    {!r.is_active && ' · inactive'}
                  </div>
                </div>
                <span className="bp-rp-radio" />
              </div>
            );
          })}
        </div>
      </div>

      {/* EVENT TYPE */}
      <div className="bp-section">
        <div className="bp-section-head"><h4>Event type</h4></div>
        <div className="bp-fld">
          <label htmlFor="ed-evt">Event type</label>
          <select
            id="ed-evt"
            name="event_type_id"
            value={form.event_type_id || ''}
            onChange={(e) => setF('event_type_id', e.target.value)}
          >
            <option value="">— None —</option>
            {filteredEventTypes.map((et) => (
              <option key={et.id} value={et.id}>
                {et.name} · {et.duration_minutes} min
              </option>
            ))}
          </select>
          {filteredEventTypes.length === 0 && form.resource_id && (
            <div className="bp-fld-hint">No event types configured for this resource.</div>
          )}
        </div>
      </div>

      {/* WHEN */}
      <div className="bp-section">
        <div className="bp-section-head"><h4>When</h4></div>
        <div className="bp-fld-row">
          <div className="bp-fld">
            <label htmlFor="ed-start">Start</label>
            <input
              id="ed-start"
              name="start_at"
              type="datetime-local"
              required
              value={form.start_at}
              onChange={(e) => setF('start_at', e.target.value)}
            />
          </div>
          <div className="bp-fld">
            <label htmlFor="ed-end">End</label>
            <input
              id="ed-end"
              name="end_at"
              type="datetime-local"
              required
              value={form.end_at}
              onChange={(e) => setF('end_at', e.target.value)}
            />
          </div>
        </div>
        <div className="bp-fld-hint">Times are in your local timezone.</div>
      </div>

      {/* LOCATION */}
      <div className="bp-section">
        <div className="bp-section-head"><h4>Location</h4></div>
        <input type="hidden" name="meeting_type" value={form.meeting_type || ''} />
        <div className="bp-fld">
          <label>Meeting type</label>
          <div className="bp-fld-seg">
            <button
              type="button"
              className={form.meeting_type === 'in_person' ? 'on' : ''}
              onClick={() => setF('meeting_type', 'in_person')}
            >
              In person
            </button>
            <button
              type="button"
              className={form.meeting_type === 'online' ? 'on' : ''}
              onClick={() => setF('meeting_type', 'online')}
            >
              Online
            </button>
            <button
              type="button"
              className={form.meeting_type === 'telephone' ? 'on' : ''}
              onClick={() => setF('meeting_type', 'telephone')}
            >
              Telephone
            </button>
            <button
              type="button"
              className={!form.meeting_type ? 'on' : ''}
              onClick={() => setF('meeting_type', '')}
            >
              None
            </button>
          </div>
          <div className="bp-fld-hint">Location details and provider config — coming in the locations feature.</div>
        </div>
      </div>

      {/* DETAILS */}
      <div className="bp-section">
        <div className="bp-section-head"><h4>Details</h4></div>
        <div className="bp-fld">
          <label htmlFor="ed-ref">Reference</label>
          <input
            id="ed-ref"
            name="public_reference"
            type="text"
            placeholder="Optional ID (e.g. invoice number)"
            value={form.public_reference}
            onChange={(e) => setF('public_reference', e.target.value)}
          />
        </div>
        <div className="bp-fld">
          <label htmlFor="ed-notes">Notes</label>
          <textarea
            id="ed-notes"
            name="notes"
            placeholder="Internal or customer-facing notes"
            value={form.notes}
            onChange={(e) => setF('notes', e.target.value)}
          />
        </div>
      </div>
    </>
  );
}
