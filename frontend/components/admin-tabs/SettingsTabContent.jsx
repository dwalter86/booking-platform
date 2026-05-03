'use client';

import { useState } from 'react';
import DataCard from '../DataCard';

const TIMEZONES = [
  'Europe/London',
  'Europe/Dublin',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Brussels',
  'Europe/Zurich',
  'Europe/Stockholm',
  'Europe/Oslo',
  'Europe/Copenhagen',
  'Europe/Helsinki',
  'Europe/Warsaw',
  'Europe/Prague',
  'Europe/Vienna',
  'Europe/Budapest',
  'Europe/Bucharest',
  'Europe/Athens',
  'Europe/Istanbul',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'America/Phoenix',
  'America/Anchorage',
  'America/Halifax',
  'America/St_Johns',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'America/Bogota',
  'America/Lima',
  'America/Mexico_City',
  'Asia/Dubai',
  'Asia/Riyadh',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Jakarta',
  'Asia/Karachi',
  'Asia/Tashkent',
  'Asia/Almaty',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Perth',
  'Pacific/Auckland',
  'Pacific/Honolulu',
  'UTC',
];

function asValue(value, fallback = '') {
  return value === null || value === undefined ? fallback : String(value);
}

function ReadRow({ label, value }) {
  return (
    <div className="col-md-6">
      <div className="subheader mb-1">{label}</div>
      <div>{value || <span className="text-secondary">Not set</span>}</div>
    </div>
  );
}

export default function SettingsTabContent({ tenant, subscription, success, error }) {
  const [editSection, setEditSection] = useState(null);

  if (!tenant) {
    return <div className="alert alert-danger">Unable to load tenant profile.</div>;
  }

  function openSection(section) {
    setEditSection(prev => (prev === section ? null : section));
  }

  function cardHeader(title, section) {
    return (
      <div className="d-flex align-items-center justify-content-between w-100">
        <span>{title}</span>
        {section && (
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => openSection(section)}
          >
            {editSection === section ? 'Cancel' : 'Edit'}
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {success ? <div className="alert alert-success mb-4">{success}</div> : null}
      {error   ? <div className="alert alert-danger  mb-4">{error}</div>   : null}

      {/* Account — read only */}
      <DataCard title="Account">
        <div className="row g-3">
          <div className="col-md-3">
            <div className="subheader mb-1">Subdomain</div>
            <div>{tenant.subdomain}.availio.co</div>
          </div>
          <div className="col-md-3">
            <div className="subheader mb-1">Account status</div>
            <span className={`badge ${tenant.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
              {tenant.status}
            </span>
          </div>
          <div className="col-md-3">
            <div className="subheader mb-1">Member since</div>
            <div>{new Date(tenant.created_at).toLocaleDateString('en-GB')}</div>
          </div>
          {subscription && (
            <div className="col-md-3">
              <div className="subheader mb-1">Plan</div>
              <div className="d-flex align-items-center gap-2">
                <span className="fw-medium">{subscription.plan_name || '—'}</span>
                <span className={`badge ${
                  subscription.status === 'active'   ? 'bg-success'   :
                  subscription.status === 'trial'    ? 'bg-info'      :
                  subscription.status === 'grace'    ? 'bg-warning'   : 'bg-secondary'
                } text-white`}>
                  {subscription.status}
                </span>
              </div>
            </div>
          )}
        </div>
      </DataCard>

      {/* Business profile */}
      <div className="card mb-3">
        <div className="card-header">
          {cardHeader('Business profile', 'profile')}
        </div>
        <div className="card-body">
          {editSection === 'profile' ? (
            <form action="/settings-actions/update" method="post">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Business name</label>
                  <input className="form-control" type="text" name="name"
                    defaultValue={asValue(tenant.name)} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Display name</label>
                  <input className="form-control" type="text" name="display_name"
                    defaultValue={asValue(tenant.display_name)}
                    placeholder="Trading name if different from business name" />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Contact email</label>
                  <input className="form-control" type="email" name="contact_email"
                    defaultValue={asValue(tenant.contact_email)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Timezone</label>
                  <select className="form-select" name="timezone"
                    defaultValue={asValue(tenant.timezone, 'Europe/London')}>
                    {TIMEZONES.map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12 d-flex gap-2">
                  <button className="btn btn-primary" type="submit">Save</button>
                  <button className="btn btn-outline-secondary" type="button"
                    onClick={() => setEditSection(null)}>Cancel</button>
                </div>
              </div>
            </form>
          ) : (
            <div className="row g-3">
              <ReadRow label="Business name"  value={asValue(tenant.name)} />
              <ReadRow label="Display name"   value={asValue(tenant.display_name)} />
              <ReadRow label="Contact email"  value={asValue(tenant.contact_email)} />
              <ReadRow label="Timezone"       value={asValue(tenant.timezone)} />
            </div>
          )}
        </div>
      </div>

      {/* Business branding */}
      <div className="card mb-3">
        <div className="card-header">
          {cardHeader('Business branding', 'branding')}
        </div>
        <div className="card-body">
          {editSection === 'branding' ? (
            <>
              {/* Logo upload */}
              <div className="mb-4">
                <label className="form-label fw-medium">Logo</label>
                <form action="/settings-actions/upload-logo" method="post" encType="multipart/form-data">
                  <div className="d-flex gap-3 align-items-center flex-wrap mb-2">
                    {tenant.logo_url && (
                      <img
                        src={tenant.logo_url}
                        alt="Current logo"
                        style={{ height: 48, width: 'auto', objectFit: 'contain', border: '1px solid #dee2e6', borderRadius: 4, padding: 4 }}
                      />
                    )}
                    <div>
                      <div className="d-flex gap-2 align-items-center">
                        <input
                          className="form-control"
                          type="file"
                          name="logo"
                          accept=".webp,.png,.jpg,.jpeg,.svg,image/webp,image/png,image/jpeg,image/svg+xml"
                          style={{ maxWidth: 280 }}
                        />
                        <button className="btn btn-primary" type="submit">Upload</button>
                      </div>
                      <div className="form-hint mt-1">Accepted: WebP, PNG, JPG, SVG. Max 2MB.</div>
                    </div>
                  </div>
                </form>
              </div>

              {/* Brand colour */}
              <form action="/settings-actions/update" method="post">
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label fw-medium">Brand colour</label>
                    <div className="d-flex gap-2 align-items-center">
                      <input
                        className="form-control form-control-color"
                        type="color"
                        name="brand_colour"
                        defaultValue={asValue(tenant.brand_colour, '#3b82f6')}
                        style={{ width: 48, height: 38, padding: 2 }}
                      />
                      <input
                        className="form-control"
                        type="text"
                        name="brand_colour_text"
                        defaultValue={asValue(tenant.brand_colour, '#3b82f6')}
                        placeholder="#3b82f6"
                        style={{ maxWidth: 120 }}
                        readOnly
                      />
                    </div>
                    <div className="form-hint mt-1">Used for public-facing branding.</div>
                  </div>
                  <div className="col-12 d-flex gap-2 mt-3">
                    <button className="btn btn-primary" type="submit">Save colour</button>
                    <button className="btn btn-outline-secondary" type="button"
                      onClick={() => setEditSection(null)}>Cancel</button>
                  </div>
                </div>
              </form>
            </>
          ) : (
            <div className="row g-3 align-items-center">
              <div className="col-md-6">
                <div className="subheader mb-1">Logo</div>
                {tenant.logo_url ? (
                  <img
                    src={tenant.logo_url}
                    alt="Logo"
                    style={{ height: 48, width: 'auto', objectFit: 'contain', border: '1px solid #dee2e6', borderRadius: 4, padding: 4 }}
                  />
                ) : (
                  <span className="text-secondary">No logo set</span>
                )}
              </div>
              <div className="col-md-6">
                <div className="subheader mb-1">Brand colour</div>
                {tenant.brand_colour ? (
                  <div className="d-flex align-items-center gap-2">
                    <div style={{
                      width: 24, height: 24, borderRadius: 4,
                      background: tenant.brand_colour,
                      border: '1px solid #dee2e6'
                    }} />
                    <span>{tenant.brand_colour}</span>
                  </div>
                ) : (
                  <span className="text-secondary">Not set</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Booking message */}
      <div className="card mb-3">
        <div className="card-header">
          {cardHeader('Booking message', 'booking')}
        </div>
        <div className="card-body">
          {editSection === 'booking' ? (
            <form action="/settings-actions/update-booking" method="post">
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-check">
                    <input className="form-check-input" type="checkbox"
                      name="public_booking_enabled"
                      defaultChecked={tenant.public_booking_enabled} />
                    <span className="form-check-label">
                      Public booking enabled
                      <span className="form-hint d-block">
                        When disabled, your public booking page will show as unavailable.
                      </span>
                    </span>
                  </label>
                </div>
                <div className="col-12">
                  <label className="form-label">Confirmation message</label>
                  <textarea className="form-control" name="booking_confirmation_message"
                    rows={4}
                    defaultValue={asValue(tenant.booking_confirmation_message)}
                    placeholder="Thank you for your booking request. We will be in touch to confirm shortly." />
                  <div className="form-hint">Shown to the public after they submit a booking request.</div>
                </div>
                <div className="col-12 d-flex gap-2">
                  <button className="btn btn-primary" type="submit">Save</button>
                  <button className="btn btn-outline-secondary" type="button"
                    onClick={() => setEditSection(null)}>Cancel</button>
                </div>
              </div>
            </form>
          ) : (
            <div className="row g-3">
              <div className="col-md-4">
                <div className="subheader mb-1">Public booking</div>
                <span className={`badge ${tenant.public_booking_enabled ? 'bg-success' : 'bg-secondary'}`}>
                  {tenant.public_booking_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="col-md-8">
                <div className="subheader mb-1">Confirmation message</div>
                {tenant.booking_confirmation_message
                  ? <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{tenant.booking_confirmation_message}</p>
                  : <span className="text-secondary">Not set</span>
                }
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
