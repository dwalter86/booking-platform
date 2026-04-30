import Link from 'next/link';
import LayoutShell from '../../../../../components/LayoutShell';
import BookingFormTypeSelector from '../../../../../components/BookingFormTypeSelector';
import AvailabilityRulesList from '../../../../../components/AvailabilityRulesList';
import AvailabilityExceptionsList from '../../../../../components/AvailabilityExceptionsList';
import DayOfWeekSelector from '../../../../../components/DayOfWeekSelector';
import AllDayToggle from '../../../../../components/AllDayToggle';
import { apiFetch, requireAuth } from '../../../../../lib/auth';

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
  const [rulesRes, exceptionsRes] = await Promise.all([
    apiFetch(`/api/availability-rules?resource_id=${id}`),
    apiFetch(`/api/availability-exceptions?resource_id=${id}`),
  ]);
  const rules      = rulesRes.ok      ? await rulesRes.json()      : [];
  const exceptions = exceptionsRes.ok ? await exceptionsRes.json() : [];

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
              <div className="col-md-6">
                <label className="form-label">Name</label>
                <input className="form-control" type="text" name="name" defaultValue={asValue(resource.name)} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Slug</label>
                <input className="form-control" type="text" name="slug" defaultValue={asValue(resource.slug)} required />
                <div className="form-text">Used in the public booking URL: /book/{asValue(resource.slug)}</div>
              </div>
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
                <select className="form-select" name="booking_mode" defaultValue={asValue(resource.booking_mode, 'free')}>
                  <option value="free">Free</option>
                  <option value="availability_only">Availability only</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Timezone</label>
                <input className="form-control" type="text" name="timezone" defaultValue={asValue(resource.timezone, 'Europe/London')} placeholder="e.g. Europe/London" />
              </div>
              <div className="col-md-4">
                <label className="form-label">Max booking hours</label>
                <input className="form-control" type="number" step="0.5" min="0" name="max_booking_duration_hours" defaultValue={asValue(resource.max_booking_duration_hours)} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Min notice hours</label>
                <input className="form-control" type="number" min="0" name="min_notice_hours" defaultValue={asValue(resource.min_notice_hours, '0')} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Max advance days</label>
                <input className="form-control" type="number" min="0" name="max_advance_booking_days" defaultValue={asValue(resource.max_advance_booking_days)} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Buffer before (mins)</label>
                <input className="form-control" type="number" min="0" name="buffer_before_minutes" defaultValue={asValue(resource.buffer_before_minutes, '0')} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Buffer after (mins)</label>
                <input className="form-control" type="number" min="0" name="buffer_after_minutes" defaultValue={asValue(resource.buffer_after_minutes, '0')} />
              </div>
              <div className="col-md-6">
                <label className="form-check">
                  <input className="form-check-input" type="checkbox" name="is_active" defaultChecked={checked(resource.is_active)} />
                  <span className="form-check-label">Resource is active</span>
                </label>
              </div>
              <div className="col-md-6">
                <label className="form-check">
                  <input className="form-check-input" type="checkbox" name="auto_confirm" defaultChecked={checked(resource.auto_confirm)} />
                  <span className="form-check-label">Auto-confirm bookings</span>
                </label>
                <div className="form-text">Bookings are confirmed immediately on submission. If fully booked, the request is rejected.</div>
              </div>
              <div className="col-12 d-flex justify-content-between align-items-center">
                <button className="btn btn-primary" type="submit">Save changes</button>
                <form action="/resource-actions/delete" method="post" style={{ display: 'inline' }}>
                  <input type="hidden" name="id" value={resource.id} />
                  <button className="btn btn-outline-danger" type="submit">Delete resource</button>
                </form>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ── Booking form ── */}
      <div className="card mb-4">
        <div className="card-header" style={{ backgroundColor: '#1e2a78', color: '#fff' }}>
          <h3 className="card-title mb-0" style={{ color: '#fff' }}>Booking form</h3>
          <p className="card-subtitle mt-1" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
            Choose the layout customers see when booking this resource. Changes save automatically.
          </p>
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
          <h3 className="card-title mb-0" style={{ color: '#fff' }}>Availability</h3>
          <p className="card-subtitle mt-1" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
            Set the weekly schedule and any date-specific exceptions for this resource.
          </p>
        </div>
        <div className="card-body">
          <div className="d-flex flex-column gap-4">

            {/* Action buttons */}
            <div className="d-flex gap-2">
              <Link
                className={`btn btn-sm ${show === 'rule' ? 'btn-primary' : 'btn-outline-primary'}`}
                href={show === 'rule' ? returnBase : `${returnBase}?show=rule`}
              >
                Add rule
              </Link>
              <Link
                className={`btn btn-sm ${show === 'exception' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                href={show === 'exception' ? returnBase : `${returnBase}?show=exception`}
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
                      <Link className="btn btn-outline-secondary btn-sm" href={returnBase}>Cancel</Link>
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
                      <Link className="btn btn-outline-secondary btn-sm" href={returnBase}>Cancel</Link>
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
                      <button className="btn btn-primary btn-sm" type="submit">Add exception</button>
                      <Link className="btn btn-outline-secondary btn-sm" href={returnBase}>Cancel</Link>
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
                      <Link className="btn btn-outline-secondary btn-sm" href={returnBase}>Cancel</Link>
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
