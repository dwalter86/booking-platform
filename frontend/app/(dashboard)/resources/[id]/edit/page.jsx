import Link from 'next/link';
import LayoutShell from '../../../../../components/LayoutShell';
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

  const [rulesRes, exceptionsRes, eventTypesRes] = await Promise.all([
    apiFetch(`/api/availability-rules?resource_id=${id}`),
    apiFetch(`/api/availability-exceptions?resource_id=${id}`),
    apiFetch(`/api/event-types?resource_id=${id}`),
  ]);

  const rules      = rulesRes.ok      ? await rulesRes.json()      : [];
  const exceptions = exceptionsRes.ok ? await exceptionsRes.json() : [];
  const eventTypes = eventTypesRes.ok ? await eventTypesRes.json() : [];

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
      {error   && <div className="alert alert-danger  mb-4">{error}</div>}

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
                hintText={`Used in the public booking URL. Edit if needed.`}
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
                <label className="form-label">Timezone</label>
                <select className="form-select" name="timezone" defaultValue={asValue(resource.timezone, 'Europe/London')}>
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
              <div className="col-md-4 d-flex align-items-end">
                <label className="form-check mb-2">
                  <input className="form-check-input" type="checkbox" name="is_active" defaultChecked={checked(resource.is_active)} />
                  <span className="form-check-label">Resource is active</span>
                </label>
              </div>
              <div className="col-12 d-flex justify-content-between align-items-center">
                <button className="btn btn-primary" type="submit">Save changes</button>
                <DeleteResourceButton resourceId={resource.id} hasBookings={false} />
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ── Event Types ── */}
      <div className="card mb-4">
        <div className="card-header d-flex align-items-center justify-content-between" style={{ backgroundColor: '#1e2a78', color: '#fff' }}>
          <div>
            <h3 className="card-title mb-1" style={{ color: '#fff' }}>Event Types</h3>
            <p className="card-subtitle mb-0" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              Bookable formats for this resource.
            </p>
          </div>
          <Link
            href={`/event-types/new?resource_id=${resource.id}`}
            className="btn btn-sm btn-outline-light"
          >
            Add event type
          </Link>
        </div>
        <div className="table-responsive">
          <table className="table table-vcenter card-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Duration</th>
                <th>Mode</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {!Array.isArray(eventTypes) || eventTypes.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-secondary">
                    No event types yet.{' '}
                    <Link href={`/event-types/new?resource_id=${resource.id}`}>Add one →</Link>
                  </td>
                </tr>
              ) : eventTypes.map(et => (
                <tr key={et.id}>
                  <td>
                    <div>{et.name}</div>
                    <div className="text-secondary small">{et.slug}</div>
                  </td>
                  <td>{et.duration_minutes} min</td>
                  <td className="text-secondary small">{et.booking_mode}</td>
                  <td>
                    <span className={`badge ${et.status === 'active' ? 'bg-green-lt' : 'bg-red-lt'}`}>
                      {et.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <Link
                      href={`/event-types/${et.id}/edit`}
                      className="btn btn-sm btn-outline-primary"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Availability ── */}
      <div className="card mb-4">
        <div className="card-header" style={{ backgroundColor: '#1e2a78', color: '#fff' }}>
          <div>
            <h3 className="card-title mb-1" style={{ color: '#fff' }}>Availability</h3>
            <p className="card-subtitle mb-0" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              Set the weekly schedule and date-specific exceptions for this resource.
            </p>
          </div>
        </div>
        <div className="card-body">
          <div className="d-flex flex-column gap-4">

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
                    <div className="col-6">
                      <label className="form-label">Slot duration (min)</label>
                      <input className="form-control" type="number" name="slot_duration_minutes" min="5" step="5" placeholder="e.g. 60" />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Slot interval (min)</label>
                      <input className="form-control" type="number" name="slot_interval_minutes" min="5" step="5" placeholder="e.g. 30" />
                    </div>
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
                    <div className="col-6">
                      <label className="form-label">Slot duration (min)</label>
                      <input className="form-control" type="number" name="slot_duration_minutes" min="5" step="5" placeholder="e.g. 60" defaultValue={asValue(editingRule.slot_duration_minutes)} />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Slot interval (min)</label>
                      <input className="form-control" type="number" name="slot_interval_minutes" min="5" step="5" placeholder="e.g. 30" defaultValue={asValue(editingRule.slot_interval_minutes)} />
                    </div>
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
