import Link from 'next/link';
import LayoutShell from '../../../components/LayoutShell';
import AvailabilityRulesList from '../../../components/AvailabilityRulesList';
import AvailabilityExceptionsList from '../../../components/AvailabilityExceptionsList';
import UnavailabilityBlocksList from '../../../components/UnavailabilityBlocksList';
import { apiFetch, requireAuth } from '../../../lib/auth';

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

function bookingModeLabel(mode) {
  if (mode === 'availability_only') return 'Availability only';
  if (mode === 'hybrid') return 'Hybrid';
  return 'Free';
}

export default async function ResourcesPage({ searchParams }) {
  await requireAuth();
  const response = await apiFetch('/api/resources');
  const rows = response.ok ? await response.json() : [];
  const error = searchParams?.error || '';
  const success = searchParams?.success || '';

  const selectedResourceId = searchParams?.resource_id || '';
  const isAdding = searchParams?.add === '1';
  const panel = searchParams?.panel || '';
  const isAvailabilityPanel = panel === 'availability';
  const isUnavailabilityPanel = panel === 'unavailability';
  const show = searchParams?.show || '';
  const editRuleId = searchParams?.edit_rule || '';
  const editExceptionId = searchParams?.edit_exception || '';
  const selectedResource = Array.isArray(rows)
    ? rows.find((r) => r.id === selectedResourceId) || null
    : null;

  let rules = [];
  let exceptions = [];
  let blocks = [];

  if (isAvailabilityPanel && selectedResource) {
    const [rulesRes, exceptionsRes] = await Promise.all([
      apiFetch(`/api/availability-rules?resource_id=${selectedResourceId}`),
      apiFetch(`/api/availability-exceptions?resource_id=${selectedResourceId}`),
    ]);
    rules = rulesRes.ok ? await rulesRes.json() : [];
    exceptions = exceptionsRes.ok ? await exceptionsRes.json() : [];
  }

  const editingRule = editRuleId ? (Array.isArray(rules) ? rules.find(r => r.id === editRuleId) || null : null) : null;
  const editingException = editExceptionId ? (Array.isArray(exceptions) ? exceptions.find(e => e.id === editExceptionId) || null : null) : null;

  if (isUnavailabilityPanel && selectedResource) {
    const blocksRes = await apiFetch('/api/unavailability-blocks');
    const allBlocks = blocksRes.ok ? await blocksRes.json() : [];
    blocks = allBlocks.filter((b) => b.resource_id === selectedResourceId);
  }

  const availReturnBase = isAvailabilityPanel && selectedResourceId
    ? `/resources?resource_id=${selectedResourceId}&panel=availability`
    : '';

  const unavailReturnBase = isUnavailabilityPanel && selectedResourceId
    ? `/resources?resource_id=${selectedResourceId}&panel=unavailability`
    : '';

  const addResourceButton = (
    <Link className="btn btn-primary" href="/resources?add=1">
      Add resource
    </Link>
  );

  return (
    <LayoutShell title="Resources" headerAction={addResourceButton}>
      {success ? <div className="alert alert-success">{success}</div> : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="row g-4">
        <div className={selectedResource || isAdding ? 'col-lg-7' : 'col-12'}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Resource list</h3>
            </div>
            <div className="table-responsive">
              <table className="table table-vcenter card-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Capacity</th>
                    <th>Booking mode</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {!Array.isArray(rows) || rows.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-secondary">No resources found. Click Add resource to create one.</td>
                    </tr>
                  ) : rows.map((row) => {
                    const isEditSelected = row.id === selectedResourceId && !panel;
                    const isAvailSelected = row.id === selectedResourceId && isAvailabilityPanel;
                    const isUnavailSelected = row.id === selectedResourceId && isUnavailabilityPanel;
                    const isRowActive = isEditSelected || isAvailSelected || isUnavailSelected;
                    return (
                      <tr key={row.id} className={isRowActive ? 'table-active' : undefined}>
                        <td>
                          <div>{row.name}</div>
                          <div className="text-secondary small">{row.slug}</div>
                        </td>
                        <td>
                          <span className={`badge ${row.is_active ? 'bg-green-lt' : 'bg-red-lt'}`}>
                            {row.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>{row.capacity}</td>
                        <td>{bookingModeLabel(row.booking_mode)}</td>
                        <td>
                          <div className="d-flex gap-1 flex-wrap justify-content-end">
                            <Link
                              className={`btn btn-sm ${isEditSelected ? 'btn-primary' : 'btn-outline-primary'}`}
                              href={`/resources?resource_id=${row.id}`}
                            >
                              Edit
                            </Link>
                            <Link
                              className={`btn btn-sm ${isAvailSelected ? 'btn-secondary' : 'btn-outline-secondary'}`}
                              href={`/resources?resource_id=${row.id}&panel=availability`}
                            >
                              Availability
                            </Link>
                            <Link
                              className={`btn btn-sm ${isUnavailSelected ? 'btn-warning' : 'btn-outline-warning'}`}
                              href={`/resources?resource_id=${row.id}&panel=unavailability`}
                            >
                              Unavailability
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {(selectedResource || isAdding) && (
        <div className="col-lg-5 panel-slide-in">
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h3 className="card-title">
                {isAdding
                  ? 'New resource'
                  : isAvailabilityPanel && selectedResource
                    ? `Availability — ${selectedResource.name}`
                    : isUnavailabilityPanel && selectedResource
                      ? `Unavailability — ${selectedResource.name}`
                      : selectedResource
                        ? selectedResource.name
                        : 'Resource details'}
              </h3>
              <div className="d-flex align-items-center gap-2">
                {selectedResource && !panel && (
                  <form action="/resource-actions/delete" method="post">
                    <input type="hidden" name="id" value={selectedResource.id} />
                    <button className="btn btn-sm btn-outline-danger" type="submit">Delete</button>
                  </form>
                )}
                {(isAvailabilityPanel || isUnavailabilityPanel) && selectedResource && (
                  <Link className="btn btn-sm btn-outline-secondary" href={`/resources?resource_id=${selectedResource.id}`}>
                    Edit resource
                  </Link>
                )}
                <Link href="/resources" className="btn-close" aria-label="Close" />
              </div>
            </div>
            <div className="card-body">
              {isAdding ? (
                <form action="/resource-actions/create" method="post">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">Name</label>
                      <input className="form-control" type="text" name="name" required />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Slug</label>
                      <input className="form-control" type="text" name="slug" placeholder="meeting-room-a" required />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Description</label>
                      <textarea className="form-control" name="description" rows="3" />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Capacity</label>
                      <input className="form-control" type="number" min="1" name="capacity" defaultValue="1" required />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Booking mode</label>
                      <select className="form-select" name="booking_mode" defaultValue="free">
                        <option value="free">Free</option>
                        <option value="availability_only">Availability only</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Timezone</label>
                      <input className="form-control" type="text" name="timezone" defaultValue="Europe/London" placeholder="e.g. Europe/London" />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Max booking hours</label>
                      <input className="form-control" type="number" step="0.5" min="0" name="max_booking_duration_hours" />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Min notice hours</label>
                      <input className="form-control" type="number" min="0" name="min_notice_hours" defaultValue="0" />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Max advance days</label>
                      <input className="form-control" type="number" min="0" name="max_advance_booking_days" />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Buffer before (mins)</label>
                      <input className="form-control" type="number" min="0" name="buffer_before_minutes" defaultValue="0" />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Buffer after (mins)</label>
                      <input className="form-control" type="number" min="0" name="buffer_after_minutes" defaultValue="0" />
                    </div>
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
              ) : isAvailabilityPanel && selectedResource ? (
                <div className="d-flex flex-column gap-4">

                  {/* Action buttons */}
                  <div className="d-flex gap-2">
                    <Link
                      className={`btn btn-sm ${show === 'rule' ? 'btn-primary' : 'btn-outline-primary'}`}
                      href={show === 'rule' ? availReturnBase : `${availReturnBase}&show=rule`}
                    >
                      Add rule
                    </Link>
                    <Link
                      className={`btn btn-sm ${show === 'exception' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                      href={show === 'exception' ? availReturnBase : `${availReturnBase}&show=exception`}
                    >
                      Add exception
                    </Link>
                  </div>

                  {/* Add rule form */}
                  {show === 'rule' && !editingRule && (
                    <div>
                      <h4 className="mb-3">Add availability rule</h4>
                      <form action="/availability-rule-actions/create" method="post">
                        <input type="hidden" name="resource_id" value={selectedResource.id} />
                        <input type="hidden" name="return_base" value={availReturnBase} />
                        <div className="row g-2">
                          <div className="col-12">
                            <label className="form-label d-block mb-1">Days of week</label>
                            <div className="mb-2">
                              <input type="checkbox" className="btn-check" name="day_of_week" value="all" id="dow_all" autoComplete="off" />
                              <label className="btn btn-outline-secondary btn-sm w-100" htmlFor="dow_all">Every day</label>
                            </div>
                            <div className="btn-group w-100" role="group">
                              {DAYS.map((d) => (
                                <>
                                  <input key={`i${d.value}`} type="checkbox" className="btn-check dow-day" name="day_of_week" value={d.value} id={`dow_${d.value}`} autoComplete="off" />
                                  <label key={`l${d.value}`} className="btn btn-outline-primary btn-sm" htmlFor={`dow_${d.value}`}>{d.label.slice(0, 3)}</label>
                                </>
                              ))}
                            </div>
                            <script dangerouslySetInnerHTML={{ __html: `
                              (function() {
                                var allBox = document.getElementById('dow_all');
                                var dayBoxes = Array.from(document.querySelectorAll('.dow-day'));
                                allBox.addEventListener('change', function() {
                                  dayBoxes.forEach(function(cb) { cb.checked = allBox.checked; });
                                });
                                dayBoxes.forEach(function(cb) {
                                  cb.addEventListener('change', function() {
                                    allBox.checked = dayBoxes.every(function(c) { return c.checked; });
                                  });
                                });
                              })();
                            ` }} />
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
                            <input type="checkbox" className="btn-check" id="add_rule_allday" autoComplete="off" />
                            <label className="btn btn-outline-secondary btn-sm" htmlFor="add_rule_allday">All day</label>
                          </div>
                          <script dangerouslySetInnerHTML={{ __html: `
                            (function() {
                              var cb = document.getElementById('add_rule_allday');
                              var s = document.getElementById('add_rule_start');
                              var e = document.getElementById('add_rule_end');
                              cb.addEventListener('change', function() {
                                if (cb.checked) { s.value = '00:00'; e.value = '23:59'; s.readOnly = true; e.readOnly = true; }
                                else { s.value = ''; e.value = ''; s.readOnly = false; e.readOnly = false; }
                              });
                            })();
                          ` }} />
                          {selectedResource.booking_mode !== 'free' && (
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
                          )}
                          <div className="col-12">
                            <label className="form-check">
                              <input className="form-check-input" type="checkbox" name="is_open" defaultChecked />
                              <span className="form-check-label">Open</span>
                            </label>
                          </div>
                          <div className="col-12 d-flex gap-2">
                            <button className="btn btn-primary btn-sm" type="submit">Add rule</button>
                            <Link className="btn btn-outline-secondary btn-sm" href={availReturnBase}>Cancel</Link>
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
                        <input type="hidden" name="resource_id" value={selectedResource.id} />
                        <input type="hidden" name="return_base" value={availReturnBase} />
                        <div className="row g-2">
                          <div className="col-12">
                            <label className="form-label">Day of week</label>
                            <select className="form-select" name="day_of_week" defaultValue={editingRule.day_of_week}>
                              {DAYS.map((d) => (
                                <option key={d.value} value={d.value}>{d.label}</option>
                              ))}
                            </select>
                          </div>
                          {(() => { const isAllDay = editingRule.start_time?.slice(0,5) === '00:00' && editingRule.end_time?.slice(0,5) === '23:59'; return (
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
                            <input type="checkbox" className="btn-check" id="edit_rule_allday" defaultChecked={isAllDay} autoComplete="off" />
                            <label className="btn btn-outline-secondary btn-sm" htmlFor="edit_rule_allday">All day</label>
                          </div>
                          <script dangerouslySetInnerHTML={{ __html: `
                            (function() {
                              var cb = document.getElementById('edit_rule_allday');
                              var s = document.getElementById('edit_rule_start');
                              var e = document.getElementById('edit_rule_end');
                              cb.addEventListener('change', function() {
                                if (cb.checked) { s.value = '00:00'; e.value = '23:59'; s.readOnly = true; e.readOnly = true; }
                                else { s.value = ''; e.value = ''; s.readOnly = false; e.readOnly = false; }
                              });
                            })();
                          ` }} />
                          </> ); })()}
                          {selectedResource.booking_mode !== 'free' && (
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
                          )}
                          <div className="col-12">
                            <label className="form-check">
                              <input className="form-check-input" type="checkbox" name="is_open" defaultChecked={checked(editingRule.is_open)} />
                              <span className="form-check-label">Open</span>
                            </label>
                          </div>
                          <div className="col-12 d-flex gap-2">
                            <button className="btn btn-primary btn-sm" type="submit">Save changes</button>
                            <Link className="btn btn-outline-secondary btn-sm" href={availReturnBase}>Cancel</Link>
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
                        <input type="hidden" name="resource_id" value={selectedResource.id} />
                        <input type="hidden" name="return_base" value={availReturnBase} />
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
                            <button className="btn btn-primary btn-sm" type="submit">Add exception</button>
                            <Link className="btn btn-outline-secondary btn-sm" href={availReturnBase}>Cancel</Link>
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
                        <input type="hidden" name="resource_id" value={selectedResource.id} />
                        <input type="hidden" name="return_base" value={availReturnBase} />
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
                            <Link className="btn btn-outline-secondary btn-sm" href={availReturnBase}>Cancel</Link>
                          </div>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Weekly schedule */}
                  <div>
                    <h4 className="mb-3">Weekly schedule</h4>
                    <AvailabilityRulesList rules={rules} resourceId={selectedResource.id} returnBase={availReturnBase} />
                  </div>

                  {/* Date exceptions */}
                  <div>
                    <h4 className="mb-3">Date exceptions</h4>
                    <AvailabilityExceptionsList exceptions={exceptions} resourceId={selectedResource.id} returnBase={availReturnBase} />
                  </div>

                </div>
              ) : isUnavailabilityPanel && selectedResource ? (
                <div className="d-flex flex-column gap-4">
                  <div>
                    <h4 className="mb-3">Add unavailability block</h4>
                    <form action="/unavailability-actions/create" method="post">
                      <input type="hidden" name="resource_id" value={selectedResource.id} />
                      <input type="hidden" name="return_base" value={unavailReturnBase} />
                      <div className="row g-2">
                        <div className="col-6">
                          <label className="form-label">Start</label>
                          <input className="form-control" type="datetime-local" name="start_at" required />
                        </div>
                        <div className="col-6">
                          <label className="form-label">End</label>
                          <input className="form-control" type="datetime-local" name="end_at" required />
                        </div>
                        <div className="col-12">
                          <label className="form-label">Reason</label>
                          <textarea className="form-control" name="reason" rows="2" placeholder="Maintenance, private use, etc." />
                        </div>
                        <div className="col-12">
                          <button className="btn btn-primary btn-sm" type="submit">Add block</button>
                        </div>
                      </div>
                    </form>
                  </div>

                  <div>
                    <h4 className="mb-3">Existing blocks</h4>
                    <UnavailabilityBlocksList blocks={blocks} resources={rows} returnBase={unavailReturnBase} />
                  </div>
                </div>
              ) : (
                <form action="/resource-actions/update" method="post">
                  <input type="hidden" name="id" value={selectedResource.id} />
                  <input type="hidden" name="return_resource_id" value={selectedResource.id} />
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">Name</label>
                      <input className="form-control" type="text" name="name" defaultValue={asValue(selectedResource.name)} required />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Slug</label>
                      <input className="form-control" type="text" name="slug" defaultValue={asValue(selectedResource.slug)} required />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Description</label>
                      <textarea className="form-control" name="description" rows="3" defaultValue={asValue(selectedResource.description)} />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Capacity</label>
                      <input className="form-control" type="number" min="1" name="capacity" defaultValue={asValue(selectedResource.capacity, '1')} required />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Booking mode</label>
                      <select className="form-select" name="booking_mode" defaultValue={asValue(selectedResource.booking_mode, 'free')}>
                        <option value="free">Free</option>
                        <option value="availability_only">Availability only</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Timezone</label>
                      <input className="form-control" type="text" name="timezone" defaultValue={asValue(selectedResource.timezone, 'Europe/London')} placeholder="e.g. Europe/London" />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Max booking hours</label>
                      <input className="form-control" type="number" step="0.5" min="0" name="max_booking_duration_hours" defaultValue={asValue(selectedResource.max_booking_duration_hours)} />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Min notice hours</label>
                      <input className="form-control" type="number" min="0" name="min_notice_hours" defaultValue={asValue(selectedResource.min_notice_hours, '0')} />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Max advance days</label>
                      <input className="form-control" type="number" min="0" name="max_advance_booking_days" defaultValue={asValue(selectedResource.max_advance_booking_days)} />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Buffer before (mins)</label>
                      <input className="form-control" type="number" min="0" name="buffer_before_minutes" defaultValue={asValue(selectedResource.buffer_before_minutes, '0')} />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Buffer after (mins)</label>
                      <input className="form-control" type="number" min="0" name="buffer_after_minutes" defaultValue={asValue(selectedResource.buffer_after_minutes, '0')} />
                    </div>
                    <div className="col-12">
                      <label className="form-check">
                        <input className="form-check-input" type="checkbox" name="is_active" defaultChecked={checked(selectedResource.is_active)} />
                        <span className="form-check-label">Resource is active</span>
                      </label>
                    </div>
                    <div className="col-12">
                      <button className="btn btn-primary" type="submit">Save changes</button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </LayoutShell>
  );
}
