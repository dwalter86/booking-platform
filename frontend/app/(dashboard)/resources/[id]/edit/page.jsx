import Link from 'next/link';
import LayoutShell from '../../../../../components/LayoutShell';
import BookingFormTypeSelector from '../../../../../components/BookingFormTypeSelector';
import AvailabilityRulesList from '../../../../../components/AvailabilityRulesList';
import AvailabilityExceptionsList from '../../../../../components/AvailabilityExceptionsList';
import DayOfWeekSelector from '../../../../../components/DayOfWeekSelector';
import AllDayToggle from '../../../../../components/AllDayToggle';
import { apiFetch, requireAuth } from '../../../../../lib/auth';
import DeleteResourceButton from '../../../../../components/DeleteResourceButton';
import SlugInput from '../../../../../components/SlugInput';

export const dynamic = 'force-dynamic';

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

function asValue(value, fallback = '') {
  return value === null || value === undefined ? fallback : String(value);
}

function checked(value) {
  return Boolean(value);
}

export default async function ResourceEditPage({ params, searchParams }) {
  await requireAuth();
  const { id } = params;

  const res = await apiFetch('/api/resources');
  if (!res.ok) {
    return (
      <LayoutShell title="Resource not found">
        <div className="alert alert-danger">Could not load resources. Please try again.</div>
        <Link href="/resources" className="btn btn-outline-secondary btn-sm">← Back to Resources</Link>
      </LayoutShell>
    );
  }

  const rows = await res.json();
  const resource = Array.isArray(rows) ? rows.find(r => r.id === id) || null : null;

  if (!resource) {
    return (
      <LayoutShell title="Resource not found">
        <div className="alert alert-danger">Resource not found or you do not have access.</div>
        <Link href="/resources" className="btn btn-outline-secondary btn-sm">← Back to Resources</Link>
      </LayoutShell>
    );
  }

  // Fetch availability data
  const [rulesRes, exceptionsRes, subscriptionRes] = await Promise.all([
    apiFetch(`/api/availability-rules?resource_id=${id}`),
    apiFetch(`/api/availability-exceptions?resource_id=${id}`),
    apiFetch('/api/plans/subscription'),
  ]);
  const rules        = rulesRes.ok        ? await rulesRes.json()        : [];
  const exceptions   = exceptionsRes.ok   ? await exceptionsRes.json()   : [];
  const subscription = subscriptionRes.ok ? await subscriptionRes.json() : null;
  const isSolo       = subscription?.plan_code === 'solo';

  const success = searchParams?.success || '';
  const error   = searchParams?.error   || '';
  const show    = searchParams?.show    || '';
  const editRuleId      = searchParams?.edit_rule      || '';
  const editExceptionId = searchParams?.edit_exception || '';

  const editingRule      = editRuleId      ? (Array.isArray(rules)      ? rules.find(r => r.id === editRuleId)           || null : null) : null;
  const editingException = editExceptionId ? (Array.isArray(exceptions) ? exceptions.find(e => e.id === editExceptionId) || null : null) : null;

  const returnBase = `/resources/${id}/edit`;

  const backButton = (
    <Link href="/resources" className="btn btn-sm btn-outline-secondary">
      ← Resources
    </Link>
  );

  return (
    <LayoutShell title={resource.name} headerAction={backButton}>
      {success && <div className="alert alert-success mb-4">{success}</div>}
      {error   && <div className="alert alert-danger mb-4">{error}</div>}

      {/* ── Resource details ── */}
      <div className="card mb-4">
        <div className="card-header" style={{ backgroundColor: '#1e2a78', color: '#fff' }}>
          <h3 className="card-title mb-0" style={{ color: '#fff' }}>Resource details</h3>
        </div>
        <div className="card-body">
          <form action="/resource-actions/update" method="post">
            <input type="hidden" name="id" value={resource.id} />
            <input type="hidden" name="return_to" value={returnBase} />
            <div className="row g-3">
              <SlugInput
                defaultName={asValue(resource.name)}
                defaultSlug={asValue(resource.slug)}
                hintText={`Used in the public booking URL: /book/${asValue(resource.slug)}. Edit if needed.`}
              />
              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea className="form-control" name="description" rows="3" defaultValue={asValue(resource.description)} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Capacity</label>
                <input className="form-control" type="number" min="1" name="capacity" defaultValue={asValue(resource.capacity, '1')} required />
              </div>
              <div className="col-md-4">
                <label className="form-label">Booking mode</label>
                {isSolo ? (
                  <>
                    <input type="hidden" name="booking_mode" value={asValue(resource.booking_mode, 'availability_only')} />
                    <div className="form-control-plaintext text-secondary">
                      {resource.booking_mode === 'free' ? 'Free' :
                       resource.booking_mode === 'hybrid' ? 'Hybrid' : 'Availability only'}
                    </div>
                    <div className="form-hint">
                      <a href="/upgrade">Upgrade to Business</a> to unlock all booking modes.
                    </div>
                  </>
                ) : (
                  <select className="form-select" name="booking_mode" defaultValue={asValue(resource.booking_mode, 'free')}>
                    <option value="free">Free</option>
                    <option value="availability_only">Availability only</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                )}
              </div>
              <div className="col-md-4">
                <label className="form-label">Timezone</label>
                <select className="form-select" name="timezone" defaultValue={asValue(resource.timezone, 'Europe/London')}>
                  <optgroup label="UK &amp; Ireland">
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="Europe/Dublin">Europe/Dublin (GMT/IST)</option>
                  </optgroup>
                  <optgroup label="Europe">
                    <option value="Europe/Amsterdam">Europe/Amsterdam (CET/CEST)</option>
                    <option value="Europe/Athens">Europe/Athens (EET/EEST)</option>
                    <option value="Europe/Belgrade">Europe/Belgrade (CET/CEST)</option>
                    <option value="Europe/Berlin">Europe/Berlin (CET/CEST)</option>
                    <option value="Europe/Brussels">Europe/Brussels (CET/CEST)</option>
                    <option value="Europe/Bucharest">Europe/Bucharest (EET/EEST)</option>
                    <option value="Europe/Budapest">Europe/Budapest (CET/CEST)</option>
                    <option value="Europe/Copenhagen">Europe/Copenhagen (CET/CEST)</option>
                    <option value="Europe/Helsinki">Europe/Helsinki (EET/EEST)</option>
                    <option value="Europe/Lisbon">Europe/Lisbon (WET/WEST)</option>
                    <option value="Europe/Ljubljana">Europe/Ljubljana (CET/CEST)</option>
                    <option value="Europe/Luxembourg">Europe/Luxembourg (CET/CEST)</option>
                    <option value="Europe/Madrid">Europe/Madrid (CET/CEST)</option>
                    <option value="Europe/Malta">Europe/Malta (CET/CEST)</option>
                    <option value="Europe/Nicosia">Europe/Nicosia (EET/EEST)</option>
                    <option value="Europe/Oslo">Europe/Oslo (CET/CEST)</option>
                    <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
                    <option value="Europe/Prague">Europe/Prague (CET/CEST)</option>
                    <option value="Europe/Riga">Europe/Riga (EET/EEST)</option>
                    <option value="Europe/Rome">Europe/Rome (CET/CEST)</option>
                    <option value="Europe/Sofia">Europe/Sofia (EET/EEST)</option>
                    <option value="Europe/Stockholm">Europe/Stockholm (CET/CEST)</option>
                    <option value="Europe/Tallinn">Europe/Tallinn (EET/EEST)</option>
                    <option value="Europe/Valletta">Europe/Valletta (CET/CEST)</option>
                    <option value="Europe/Vienna">Europe/Vienna (CET/CEST)</option>
                    <option value="Europe/Vilnius">Europe/Vilnius (EET/EEST)</option>
                    <option value="Europe/Warsaw">Europe/Warsaw (CET/CEST)</option>
                    <option value="Europe/Zagreb">Europe/Zagreb (CET/CEST)</option>
                  </optgroup>
                  <optgroup label="UTC">
                    <option value="UTC">UTC</option>
                  </optgroup>
                  <optgroup label="Africa">
                    <option value="Africa/Abidjan">Africa/Abidjan (GMT)</option>
                    <option value="Africa/Cairo">Africa/Cairo (EET)</option>
                    <option value="Africa/Casablanca">Africa/Casablanca (WET)</option>
                    <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                    <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                    <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                  </optgroup>
                  <optgroup label="America">
                    <option value="America/Anchorage">America/Anchorage (AKST/AKDT)</option>
                    <option value="America/Argentina/Buenos_Aires">America/Argentina/Buenos_Aires (ART)</option>
                    <option value="America/Bogota">America/Bogota (COT)</option>
                    <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                    <option value="America/Denver">America/Denver (MST/MDT)</option>
                    <option value="America/Halifax">America/Halifax (AST/ADT)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                    <option value="America/Mexico_City">America/Mexico_City (CST/CDT)</option>
                    <option value="America/New_York">America/New_York (EST/EDT)</option>
                    <option value="America/Phoenix">America/Phoenix (MST)</option>
                    <option value="America/Santiago">America/Santiago (CLT/CLST)</option>
                    <option value="America/Sao_Paulo">America/Sao_Paulo (BRT/BRST)</option>
                    <option value="America/St_Johns">America/St_Johns (NST/NDT)</option>
                    <option value="America/Toronto">America/Toronto (EST/EDT)</option>
                    <option value="America/Vancouver">America/Vancouver (PST/PDT)</option>
                  </optgroup>
                  <optgroup label="Asia">
                    <option value="Asia/Bangkok">Asia/Bangkok (ICT)</option>
                    <option value="Asia/Colombo">Asia/Colombo (IST)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                    <option value="Asia/Hong_Kong">Asia/Hong_Kong (HKT)</option>
                    <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                    <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="Asia/Kuala_Lumpur">Asia/Kuala_Lumpur (MYT)</option>
                    <option value="Asia/Riyadh">Asia/Riyadh (AST)</option>
                    <option value="Asia/Seoul">Asia/Seoul (KST)</option>
                    <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                    <option value="Asia/Taipei">Asia/Taipei (CST)</option>
                    <option value="Asia/Tehran">Asia/Tehran (IRST/IRDT)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                  </optgroup>
                  <optgroup label="Atlantic">
                    <option value="Atlantic/Azores">Atlantic/Azores (AZOT/AZOST)</option>
                    <option value="Atlantic/Cape_Verde">Atlantic/Cape_Verde (CVT)</option>
                    <option value="Atlantic/Reykjavik">Atlantic/Reykjavik (GMT)</option>
                  </optgroup>
                  <optgroup label="Australia &amp; Pacific">
                    <option value="Australia/Adelaide">Australia/Adelaide (ACST/ACDT)</option>
                    <option value="Australia/Brisbane">Australia/Brisbane (AEST)</option>
                    <option value="Australia/Melbourne">Australia/Melbourne (AEST/AEDT)</option>
                    <option value="Australia/Perth">Australia/Perth (AWST)</option>
                    <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</option>
                    <option value="Pacific/Auckland">Pacific/Auckland (NZST/NZDT)</option>
                    <option value="Pacific/Fiji">Pacific/Fiji (FJT)</option>
                    <option value="Pacific/Honolulu">Pacific/Honolulu (HST)</option>
                  </optgroup>
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-check mt-2">
                  <input className="form-check-input" type="checkbox" name="is_active" defaultChecked={checked(resource.is_active)} />
                  <span className="form-check-label">Resource is active</span>
                </label>
              </div>
              <div className="col-md-6">
                <label className="form-check mt-2">
                  <input className="form-check-input" type="checkbox" name="auto_confirm" defaultChecked={checked(resource.auto_confirm)} />
                  <span className="form-check-label">Auto-confirm bookings</span>
                </label>
                <div className="form-text">Bookings are confirmed immediately on submission. If fully booked, the request is rejected.</div>
              </div>

              {/* Advanced settings */}
              <div className="col-12">
                {isSolo ? (
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label fw-medium">Appointment duration (hours)</label>
                      <input className="form-control" type="number" step="0.5" min="0.5" name="max_booking_duration_hours" defaultValue={asValue(resource.max_booking_duration_hours, '1')} />
                      <div className="form-text">How long each appointment lasts. This sets the slot length on your availability schedule.</div>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Min notice hours</label>
                      <input className="form-control" type="number" min="0" name="min_notice_hours" defaultValue={asValue(resource.min_notice_hours, '0')} />
                      <div className="form-text">How far in advance a booking must be made.</div>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Max advance days</label>
                      <input className="form-control" type="number" min="0" name="max_advance_booking_days" defaultValue={asValue(resource.max_advance_booking_days)} />
                      <div className="form-text">How far ahead customers can book. Leave blank for no limit.</div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Buffer before (mins)</label>
                      <input className="form-control" type="number" min="0" name="buffer_before_minutes" defaultValue={asValue(resource.buffer_before_minutes, '0')} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Buffer after (mins)</label>
                      <input className="form-control" type="number" min="0" name="buffer_after_minutes" defaultValue={asValue(resource.buffer_after_minutes, '0')} />
                    </div>
                  </div>
                ) : (
                  <details>
                    <summary className="text-secondary" style={{ cursor: 'pointer', userSelect: 'none', fontSize: 13 }}>
                      Advanced settings
                    </summary>
                    <div className="row g-3 mt-2">
                      <div className="col-md-4">
                        <label className="form-label">Max booking hours</label>
                        <input className="form-control" type="number" step="0.5" min="0" name="max_booking_duration_hours" defaultValue={asValue(resource.max_booking_duration_hours)} />
                        <div className="form-text">Leave blank for no limit.</div>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Min notice hours</label>
                        <input className="form-control" type="number" min="0" name="min_notice_hours" defaultValue={asValue(resource.min_notice_hours, '0')} />
                        <div className="form-text">How far in advance a booking must be made.</div>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Max advance days</label>
                        <input className="form-control" type="number" min="0" name="max_advance_booking_days" defaultValue={asValue(resource.max_advance_booking_days)} />
                        <div className="form-text">How far ahead customers can book. Leave blank for no limit.</div>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Buffer before (mins)</label>
                        <input className="form-control" type="number" min="0" name="buffer_before_minutes" defaultValue={asValue(resource.buffer_before_minutes, '0')} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Buffer after (mins)</label>
                        <input className="form-control" type="number" min="0" name="buffer_after_minutes" defaultValue={asValue(resource.buffer_after_minutes, '0')} />
                      </div>
                    </div>
                  </details>
                )}
              </div>

              <div className="col-12 d-flex justify-content-between align-items-center">
                <button className="btn btn-primary" type="submit">Save changes</button>
                <DeleteResourceButton resourceId={resource.id} hasBookings={false} />
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ── Booking form ── */}
      <div className="card mb-4">
        <div className="card-header" style={{ backgroundColor: '#1e2a78', color: '#fff' }}>
          <div>
            <h3 className="card-title mb-1" style={{ color: '#fff' }}>Booking form</h3>
            <p className="card-subtitle mb-0" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              Choose the layout customers see when booking this resource. Changes save automatically.
            </p>
          </div>
        </div>
        <div className="card-body">
          <BookingFormTypeSelector
            resourceId={resource.id}
            resourceSlug={resource.slug}
            initialValue={asValue(resource.booking_form_type, 'classic')}
          />
        </div>
      </div>

      {/* ── Availability ── */}
      <div className="card mb-4">
        <div className="card-header" style={{ backgroundColor: '#1e2a78', color: '#fff' }}>
          <div>
            <h3 className="card-title mb-1" style={{ color: '#fff' }}>Availability</h3>
            <p className="card-subtitle mb-0" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              Set the weekly schedule and any date-specific exceptions for this resource.
            </p>
          </div>
        </div>
        <div className="card-body">
          <div className="d-flex flex-column gap-4">

            {/* Action buttons */}
            <div className="d-flex gap-2">
              <Link
                className={`btn btn-sm ${show === 'rule' ? 'btn-primary' : 'btn-outline-primary'}`}
                href={show === 'rule' ? returnBase : `${returnBase}?show=rule`}
                scroll={false}
              >
                Add rule
              </Link>
              <Link
                className={`btn btn-sm ${show === 'exception' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                href={show === 'exception' ? returnBase : `${returnBase}?show=exception`}
                scroll={false}
              >
                Add exception
              </Link>
            </div>

            {/* Add rule form */}
            {show === 'rule' && !editingRule && (
              <div>
                <h4 className="mb-3">Add availability rule</h4>
                <form action="/availability-rule-actions/create" method="post">
                  <input type="hidden" name="resource_id" value={resource.id} />
                  <input type="hidden" name="return_base" value={returnBase} />
                  <div className="row g-2">
                    <div className="col-12">
                      <label className="form-label d-block mb-1">Days of week</label>
                      <DayOfWeekSelector />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Open from</label>
                      <input className="form-control" type="time" name="start_time" id="add_rule_start" required />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Open until</label>
                      <input className="form-control" type="time" name="end_time" id="add_rule_end" required />
                    </div>
                    <div className="col-12">
                      <AllDayToggle startId="add_rule_start" endId="add_rule_end" />
                    </div>
                    {resource.booking_mode !== 'free' && (
                      isSolo ? (
                        <>
                          <input
                            type="hidden"
                            name="slot_duration_minutes"
                            value={resource.max_booking_duration_hours
                              ? Math.round(Number(resource.max_booking_duration_hours) * 60)
                              : 60}
                          />
                          <div className="col-12">
                            <div className="form-hint text-secondary">
                              Slot duration is set automatically from your appointment duration ({resource.max_booking_duration_hours
                                ? Math.round(Number(resource.max_booking_duration_hours) * 60)
                                : 60} min).
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="col-6">
                            <label className="form-label">Slot duration (min)</label>
                            <input className="form-control" type="number" name="slot_duration_minutes" min="5" step="5" placeholder="e.g. 60" />
                          </div>
                          <div className="col-6">
                            <label className="form-label">Slot interval (min)</label>
                            <input className="form-control" type="number" name="slot_interval_minutes" min="5" step="5" placeholder="e.g. 30" />
                          </div>
                        </>
                      )
                    )}
                    <div className="col-12">
                      <label className="form-check">
                        <input className="form-check-input" type="checkbox" name="is_open" defaultChecked />
                        <span className="form-check-label">Open</span>
                      </label>
                    </div>
                    <div className="col-12 d-flex gap-2">
                      <button className="btn btn-primary btn-sm" type="submit">Save rule</button>
                      <Link className="btn btn-outline-secondary btn-sm" href={returnBase} scroll={false}>Cancel</Link>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Edit rule form */}
            {editingRule && (
              <div>
                <h4 className="mb-3">Edit rule — {DAYS.find(d => d.value === editingRule.day_of_week)?.label}</h4>
                <form action="/availability-rule-actions/update" method="post">
                  <input type="hidden" name="id" value={editingRule.id} />
                  <input type="hidden" name="resource_id" value={resource.id} />
                  <input type="hidden" name="return_base" value={returnBase} />
                  <div className="row g-2">
                    <div className="col-12">
                      <label className="form-label">Day of week</label>
                      <select className="form-select" name="day_of_week" defaultValue={editingRule.day_of_week}>
                        {DAYS.map(d => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                    </div>
                    {(() => {
                      const isAllDay = editingRule.start_time?.slice(0, 5) === '00:00' && editingRule.end_time?.slice(0, 5) === '23:59';
                      return (
                        <>
                          <div className="col-6">
                            <label className="form-label">Open from</label>
                            <input className="form-control" type="time" name="start_time" id="edit_rule_start" defaultValue={editingRule.start_time?.slice(0, 5)} readOnly={isAllDay} required />
                          </div>
                          <div className="col-6">
                            <label className="form-label">Open until</label>
                            <input className="form-control" type="time" name="end_time" id="edit_rule_end" defaultValue={editingRule.end_time?.slice(0, 5)} readOnly={isAllDay} required />
                          </div>
                          <div className="col-12">
                            <AllDayToggle startId="edit_rule_start" endId="edit_rule_end" defaultChecked={isAllDay} />
                          </div>
                        </>
                      );
                    })()}
                    {resource.booking_mode !== 'free' && (
                      isSolo ? (
                        <>
                          <input
                            type="hidden"
                            name="slot_duration_minutes"
                            value={resource.max_booking_duration_hours
                              ? Math.round(Number(resource.max_booking_duration_hours) * 60)
                              : 60}
                          />
                          <div className="col-12">
                            <div className="form-hint text-secondary">
                              Slot duration is set automatically from your appointment duration ({resource.max_booking_duration_hours
                                ? Math.round(Number(resource.max_booking_duration_hours) * 60)
                                : 60} min).
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="col-6">
                            <label className="form-label">Slot duration (min)</label>
                            <input className="form-control" type="number" name="slot_duration_minutes" min="5" step="5" placeholder="e.g. 60" defaultValue={asValue(editingRule.slot_duration_minutes)} />
                          </div>
                          <div className="col-6">
                            <label className="form-label">Slot interval (min)</label>
                            <input className="form-control" type="number" name="slot_interval_minutes" min="5" step="5" placeholder="e.g. 30" defaultValue={asValue(editingRule.slot_interval_minutes)} />
                          </div>
                        </>
                      )
                    )}
                    <div className="col-12">
                      <label className="form-check">
                        <input className="form-check-input" type="checkbox" name="is_open" defaultChecked={checked(editingRule.is_open)} />
                        <span className="form-check-label">Open</span>
                      </label>
                    </div>
                    <div className="col-12 d-flex gap-2">
                      <button className="btn btn-primary btn-sm" type="submit">Save changes</button>
                      <Link className="btn btn-outline-secondary btn-sm" href={returnBase} scroll={false}>Cancel</Link>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Add exception form */}
            {show === 'exception' && !editingException && (
              <div>
                <h4 className="mb-3">Add date exception</h4>
                <form action="/availability-exception-actions/create" method="post">
                  <input type="hidden" name="resource_id" value={resource.id} />
                  <input type="hidden" name="return_base" value={returnBase} />
                  <div className="row g-2">
                    <div className="col-12">
                      <label className="form-label">Date</label>
                      <input className="form-control" type="date" name="exception_date" required />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Open from</label>
                      <input className="form-control" type="time" name="start_time" />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Open until</label>
                      <input className="form-control" type="time" name="end_time" />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Note (optional)</label>
                      <input className="form-control" type="text" name="note" placeholder="e.g. Bank Holiday" />
                    </div>
                    <div className="col-12">
                      <label className="form-check">
                        <input className="form-check-input" type="checkbox" name="is_closed" />
                        <span className="form-check-label">Closed all day</span>
                      </label>
                    </div>
                    <div className="col-12 d-flex gap-2">
                      <button className="btn btn-primary btn-sm" type="submit">Save exception</button>
                      <Link className="btn btn-outline-secondary btn-sm" href={returnBase} scroll={false}>Cancel</Link>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Edit exception form */}
            {editingException && (
              <div>
                <h4 className="mb-3">Edit exception — {editingException.exception_date}</h4>
                <form action="/availability-exception-actions/update" method="post">
                  <input type="hidden" name="id" value={editingException.id} />
                  <input type="hidden" name="resource_id" value={resource.id} />
                  <input type="hidden" name="return_base" value={returnBase} />
                  <div className="row g-2">
                    <div className="col-12">
                      <label className="form-label">Date</label>
                      <input className="form-control" type="date" name="exception_date" defaultValue={editingException.exception_date} required />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Open from</label>
                      <input className="form-control" type="time" name="start_time" defaultValue={editingException.start_time?.slice(0, 5)} />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Open until</label>
                      <input className="form-control" type="time" name="end_time" defaultValue={editingException.end_time?.slice(0, 5)} />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Note (optional)</label>
                      <input className="form-control" type="text" name="note" placeholder="e.g. Bank Holiday" defaultValue={asValue(editingException.note)} />
                    </div>
                    <div className="col-12">
                      <label className="form-check">
                        <input className="form-check-input" type="checkbox" name="is_closed" defaultChecked={checked(editingException.is_closed)} />
                        <span className="form-check-label">Closed all day</span>
                      </label>
                    </div>
                    <div className="col-12 d-flex gap-2">
                      <button className="btn btn-primary btn-sm" type="submit">Save changes</button>
                      <Link className="btn btn-outline-secondary btn-sm" href={returnBase} scroll={false}>Cancel</Link>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Weekly schedule */}
            <div>
              <h4 className="mb-3">Weekly schedule</h4>
              <AvailabilityRulesList rules={rules} resourceId={resource.id} returnBase={returnBase} />
            </div>

            {/* Date exceptions */}
            <div>
              <h4 className="mb-3">Date exceptions</h4>
              <AvailabilityExceptionsList exceptions={exceptions} resourceId={resource.id} returnBase={returnBase} />
            </div>

          </div>
        </div>
      </div>

    </LayoutShell>
  );
}
