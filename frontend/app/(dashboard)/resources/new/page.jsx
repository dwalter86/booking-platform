import Link from 'next/link';
import LayoutShell from '../../../../components/LayoutShell';
import { apiFetch, requireAuth } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export default async function ResourceNewPage({ searchParams }) {
  await requireAuth();
  const error = searchParams?.error || '';

  const subscriptionRes = await apiFetch('/api/plans/subscription');
  const subscription = subscriptionRes.ok ? await subscriptionRes.json() : null;
  const isSolo = subscription?.plan_code === 'solo';

  const backButton = (
    <Link href="/resources" className="btn btn-sm btn-outline-secondary">
      ← Resources
    </Link>
  );

  return (
    <LayoutShell title="New resource" headerAction={backButton}>
      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <div className="card">
        <div className="card-header" style={{ backgroundColor: '#1e2a78', color: '#fff' }}>
          <div>
            <h3 className="card-title mb-1" style={{ color: '#fff' }}>Resource details</h3>
            <p className="card-subtitle mb-0" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              After creating, you can set the booking form style and configure availability.
            </p>
          </div>
        </div>
        <div className="card-body">
          <form action="/resource-actions/create" method="post">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Name</label>
                <input className="form-control" type="text" name="name" required autoFocus />
              </div>
              <div className="col-md-6">
                <label className="form-label">Slug</label>
                <input className="form-control" type="text" name="slug" placeholder="meeting-room-a" />
                <div className="form-text">Used in the public booking URL. Leave blank to auto-generate from name.</div>
              </div>
              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea className="form-control" name="description" rows="3" />
              </div>
              <div className="col-md-4">
                <label className="form-label">Capacity</label>
                <input className="form-control" type="number" min="1" name="capacity" defaultValue="1" required />
              </div>
              <div className="col-md-4">
                <label className="form-label">Booking mode</label>
                {isSolo ? (
                  <>
                    <input type="hidden" name="booking_mode" value="availability_only" />
                    <div className="form-control-plaintext text-secondary">Availability only</div>
                    <div className="form-hint">
                      <a href="/upgrade">Upgrade to Business</a> to unlock Free and Hybrid booking modes.
                    </div>
                  </>
                ) : (
                  <select className="form-select" name="booking_mode" defaultValue="free">
                    <option value="free">Free</option>
                    <option value="availability_only">Availability only</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                )}
              </div>
              <div className="col-md-4">
                <label className="form-label">Timezone</label>
                <select className="form-select" name="timezone" defaultValue="Europe/London">
                  <optgroup label="UK &amp; Ireland">
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="Europe/Dublin">Europe/Dublin (GMT/IST)</option>
                  </optgroup>
                  <optgroup label="Europe">
                    <option value="Europe/Amsterdam">Europe/Amsterdam (CET/CEST)</option>
                    <option value="Europe/Berlin">Europe/Berlin (CET/CEST)</option>
                    <option value="Europe/Brussels">Europe/Brussels (CET/CEST)</option>
                    <option value="Europe/Copenhagen">Europe/Copenhagen (CET/CEST)</option>
                    <option value="Europe/Helsinki">Europe/Helsinki (EET/EEST)</option>
                    <option value="Europe/Lisbon">Europe/Lisbon (WET/WEST)</option>
                    <option value="Europe/Madrid">Europe/Madrid (CET/CEST)</option>
                    <option value="Europe/Oslo">Europe/Oslo (CET/CEST)</option>
                    <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
                    <option value="Europe/Prague">Europe/Prague (CET/CEST)</option>
                    <option value="Europe/Rome">Europe/Rome (CET/CEST)</option>
                    <option value="Europe/Stockholm">Europe/Stockholm (CET/CEST)</option>
                    <option value="Europe/Vienna">Europe/Vienna (CET/CEST)</option>
                    <option value="Europe/Warsaw">Europe/Warsaw (CET/CEST)</option>
                    <option value="Europe/Zurich">Europe/Zurich (CET/CEST)</option>
                  </optgroup>
                  <optgroup label="UTC">
                    <option value="UTC">UTC</option>
                  </optgroup>
                  <optgroup label="America">
                    <option value="America/New_York">America/New_York (EST/EDT)</option>
                    <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                    <option value="America/Denver">America/Denver (MST/MDT)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                    <option value="America/Toronto">America/Toronto (EST/EDT)</option>
                    <option value="America/Vancouver">America/Vancouver (PST/PDT)</option>
                    <option value="America/Sao_Paulo">America/Sao_Paulo (BRT/BRST)</option>
                  </optgroup>
                  <optgroup label="Asia &amp; Pacific">
                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                    <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
                    <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</option>
                    <option value="Pacific/Auckland">Pacific/Auckland (NZST/NZDT)</option>
                  </optgroup>
                </select>
              </div>

              <div className="col-12">
                <label className="form-check mt-1">
                  <input className="form-check-input" type="checkbox" name="auto_confirm" />
                  <span className="form-check-label">Auto-confirm bookings</span>
                </label>
                <div className="form-text">Bookings are confirmed immediately on submission. If fully booked, the request is rejected.</div>
              </div>

              {/* Advanced settings */}
              {isSolo ? (
                <div className="col-12">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label fw-medium">Appointment duration (hours)</label>
                      <input className="form-control" type="number" step="0.5" min="0.5" name="max_booking_duration_hours" defaultValue="1" />
                      <div className="form-text">How long each appointment lasts. This sets the slot length on your availability schedule.</div>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Min notice hours</label>
                      <input className="form-control" type="number" min="0" name="min_notice_hours" defaultValue="0" />
                      <div className="form-text">How far in advance a booking must be made.</div>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Max advance days</label>
                      <input className="form-control" type="number" min="0" name="max_advance_booking_days" />
                      <div className="form-text">How far ahead customers can book. Leave blank for no limit.</div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Buffer before (mins)</label>
                      <input className="form-control" type="number" min="0" name="buffer_before_minutes" defaultValue="0" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Buffer after (mins)</label>
                      <input className="form-control" type="number" min="0" name="buffer_after_minutes" defaultValue="0" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="col-12">
                  <details>
                    <summary className="text-secondary" style={{ cursor: 'pointer', userSelect: 'none', fontSize: 13 }}>
                      Advanced settings
                    </summary>
                    <div className="row g-3 mt-2">
                      <div className="col-md-4">
                        <label className="form-label">Max booking hours</label>
                        <input className="form-control" type="number" step="0.5" min="0" name="max_booking_duration_hours" />
                        <div className="form-text">Leave blank for no limit.</div>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Min notice hours</label>
                        <input className="form-control" type="number" min="0" name="min_notice_hours" defaultValue="0" />
                        <div className="form-text">How far in advance a booking must be made.</div>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Max advance days</label>
                        <input className="form-control" type="number" min="0" name="max_advance_booking_days" />
                        <div className="form-text">How far ahead customers can book. Leave blank for no limit.</div>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Buffer before (mins)</label>
                        <input className="form-control" type="number" min="0" name="buffer_before_minutes" defaultValue="0" />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Buffer after (mins)</label>
                        <input className="form-control" type="number" min="0" name="buffer_after_minutes" defaultValue="0" />
                      </div>
                    </div>
                  </details>
                </div>
              )}

              <div className="col-12">
                <label className="form-check">
                  <input className="form-check-input" type="checkbox" name="is_active" defaultChecked />
                  <span className="form-check-label">Resource is active</span>
                </label>
              </div>
              <div className="col-12 d-flex gap-2">
                <button className="btn btn-primary" type="submit">Create resource</button>
                <Link className="btn btn-outline-secondary" href="/resources">Cancel</Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </LayoutShell>
  );
}
