'use client';

import { useState } from 'react';
import ResourceMeetingTypes from './ResourceMeetingTypes';

const BOOKING_FORM_OPTIONS = [
  { value: 'classic', label: 'Classic', description: 'Two-step form with calendar and contact details.' },
  { value: 'minimal', label: 'Minimal', description: 'Linear 4-step wizard with progress bar.' },
  { value: 'split',   label: 'Split panel', description: 'Calendar left, contact form right.' },
  { value: 'cards',   label: 'Progressive cards', description: 'Each step collapses to a summary when complete.' },
];

const BOOKING_MODE_OPTIONS = [
  { value: 'free',              label: 'Free',              description: 'Customer picks any available time.' },
  { value: 'slots',             label: 'Slots',             description: 'Customer picks from predefined time slots.' },
  { value: 'hybrid',            label: 'Hybrid',            description: 'Suggested slots with optional flexibility.' },
];

function asValue(value, fallback = '') {
  return value === null || value === undefined ? fallback : String(value);
}

export default function EventTypeForm({ action, eventType, resourceId, submitLabel, subscription, footerAction, returnTo }) {
  const [formType, setFormType] = useState(asValue(eventType?.booking_form_type, 'classic'));
  const isSolo = subscription?.plan_code === 'solo';

  return (
    <form action={action} method="post">
      {eventType?.id && <input type="hidden" name="id" value={eventType.id} />}
      <input type="hidden" name="resource_id" value={resourceId} />
      {returnTo && <input type="hidden" name="return_to" value={returnTo} />}

      <div className="row g-3">

        {/* Name */}
        <div className="col-md-6">
          <label className="form-label">Name <span className="text-danger">*</span></label>
          <input
            className="form-control"
            type="text"
            name="name"
            defaultValue={asValue(eventType?.name)}
            placeholder="e.g. 30 min consultation"
            required
          />
        </div>

        {/* Slug */}
        <div className="col-md-6">
          <label className="form-label">Slug <span className="text-danger">*</span></label>
          <input
            className="form-control"
            type="text"
            name="slug"
            defaultValue={asValue(eventType?.slug)}
            placeholder="e.g. 30-min-consultation"
            required
          />
          <div className="form-text">Used in the public booking URL. Lowercase, hyphens only.</div>
        </div>

        {/* Description */}
        <div className="col-12">
          <label className="form-label">Description</label>
          <textarea
            className="form-control"
            name="description"
            rows="2"
            defaultValue={asValue(eventType?.description)}
            placeholder="Optional — shown to customers on the booking page."
          />
        </div>

        {/* Duration */}
        <div className="col-md-4">
          <label className="form-label">Duration (minutes) <span className="text-danger">*</span></label>
          <input
            className="form-control"
            type="number"
            name="duration_minutes"
            min="5"
            step="5"
            defaultValue={asValue(eventType?.duration_minutes, '60')}
            required
          />
        </div>

        {/* Booking mode */}
        <div className="col-md-4">
          <label className="form-label">Booking mode</label>
          {isSolo ? (
            <>
              <input type="hidden" name="booking_mode" value="slots" />
              <div className="form-control-plaintext text-secondary">Slots</div>
              <div className="form-text">
                <a href="/plans">Upgrade to Business</a> to unlock Free and Hybrid booking modes.
              </div>
            </>
          ) : (
            <>
              <select
                className="form-select"
                name="booking_mode"
                defaultValue={asValue(eventType?.booking_mode, 'slots')}
              >
                {BOOKING_MODE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <div className="form-text">
                {BOOKING_MODE_OPTIONS.find(o => o.value === (eventType?.booking_mode || 'slots'))?.description}
              </div>
            </>
          )}
        </div>

        {/* Status */}
        <div className="col-md-4">
          <label className="form-label">Status</label>
          <select
            className="form-select"
            name="status"
            defaultValue={asValue(eventType?.status, 'active')}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Colour */}
        <div className="col-md-4">
          <label className="form-label">Colour</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="color"
              name="colour"
              defaultValue={eventType?.colour || '#1e2a78'}
              style={{ width: 40, height: 36, padding: 2, borderRadius: 6, border: '1px solid #dee2e6', cursor: 'pointer' }}
            />
            <span className="form-text mb-0">Shown as a colour tag on bookings and calendar events.</span>
          </div>
        </div>

        {/* Auto-confirm */}
        <div className="col-12">
          <label className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              name="auto_confirm"
              defaultChecked={Boolean(eventType?.auto_confirm)}
            />
            <span className="form-check-label">Auto-confirm bookings</span>
          </label>
          <div className="form-text">Bookings are confirmed immediately on submission.</div>
        </div>

        {/* Public booking enabled */}
        <div className="col-12">
          <label className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              name="public_booking_enabled"
              defaultChecked={eventType ? Boolean(eventType.public_booking_enabled) : true}
            />
            <span className="form-check-label">Public booking enabled</span>
          </label>
          <div className="form-text">When off, the public booking page for this event type returns a not available message.</div>
        </div>

        {/* Booking form type */}
        <div className="col-12">
          <label className="form-label">Booking form style</label>
          <div className="row g-2">
            {BOOKING_FORM_OPTIONS.map(o => (
              <div key={o.value} className="col-md-6">
                <label
                  className="form-check p-3 border rounded"
                  style={{
                    cursor: 'pointer',
                    backgroundColor: formType === o.value ? '#eef2ff' : undefined,
                    borderColor: formType === o.value ? '#1e2a78' : undefined,
                  }}
                >
                  <input
                    className="form-check-input"
                    type="radio"
                    name="booking_form_type"
                    value={o.value}
                    checked={formType === o.value}
                    onChange={() => setFormType(o.value)}
                  />
                  <span className="form-check-label ms-2">
                    <strong>{o.label}</strong>
                    <div className="text-secondary" style={{ fontSize: 12 }}>{o.description}</div>
                  </span>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Meeting types */}
        <div className="col-12">
          <label className="form-label">Meeting types</label>
          <div className="form-text mb-2">How clients can meet with you for this event type.</div>
          <ResourceMeetingTypes resourceId={resourceId} />
        </div>

        {/* Confirmation message */}
        <div className="col-12">
          <label className="form-label">Booking confirmation message</label>
          <textarea
            className="form-control"
            name="booking_confirmation_message"
            rows="2"
            defaultValue={asValue(eventType?.booking_confirmation_message)}
            placeholder="Shown to the customer after they submit a booking request."
          />
        </div>

        {/* Advanced settings */}
        <div className="col-12">
          <details>
            <summary className="text-secondary" style={{ cursor: 'pointer', userSelect: 'none', fontSize: 13 }}>
              Advanced settings
            </summary>
            <div className="row g-3 mt-2">
              <div className="col-md-4">
                <label className="form-label">Min notice hours</label>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  name="min_notice_hours"
                  defaultValue={asValue(eventType?.min_notice_hours, '0')}
                />
                <div className="form-text">How far in advance a booking must be made.</div>
              </div>
              <div className="col-md-4">
                <label className="form-label">Max advance days</label>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  name="max_advance_booking_days"
                  defaultValue={asValue(eventType?.max_advance_booking_days)}
                />
                <div className="form-text">Leave blank for no limit.</div>
              </div>
              <div className="col-md-4">
                <label className="form-label">Buffer before (mins)</label>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  name="buffer_before_minutes"
                  defaultValue={asValue(eventType?.buffer_before_minutes, '0')}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Buffer after (mins)</label>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  name="buffer_after_minutes"
                  defaultValue={asValue(eventType?.buffer_after_minutes, '0')}
                />
              </div>
            </div>
          </details>
        </div>

        {/* Submit */}
        <div className="col-12 d-flex justify-content-between align-items-center">
          <button className="btn btn-primary" type="submit">{submitLabel || 'Save'}</button>
          {footerAction && <div>{footerAction}</div>}
        </div>

      </div>
    </form>
  );
}
