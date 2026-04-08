import LayoutShell from '../../../components/LayoutShell';
import DataCard from '../../../components/DataCard';
import AvailabilityRulesList from '../../../components/AvailabilityRulesList';
import AvailabilityExceptionsList from '../../../components/AvailabilityExceptionsList';
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

export default async function AvailabilityRulesPage({ searchParams }) {
  await requireAuth();

  const resourceId = searchParams?.resource_id || '';
  const error   = searchParams?.error   || '';
  const success = searchParams?.success || '';

  // Load all resources for the selector
  const resourcesRes = await apiFetch('/api/resources');
  const resources = resourcesRes.ok ? await resourcesRes.json() : [];

  // Only load rules/exceptions once a resource is selected
  let rules = [];
  let exceptions = [];

  if (resourceId) {
    const [rulesRes, exceptionsRes] = await Promise.all([
      apiFetch(`/api/availability-rules?resource_id=${resourceId}`),
      apiFetch(`/api/availability-exceptions?resource_id=${resourceId}`),
    ]);
    rules      = rulesRes.ok      ? await rulesRes.json()      : [];
    exceptions = exceptionsRes.ok ? await exceptionsRes.json() : [];
  }

  const selectedResource = resources.find((r) => r.id === resourceId) || null;

  return (
    <LayoutShell title="Availability Rules">
      {success ? <div className="alert alert-success mb-3">{success}</div> : null}
      {error   ? <div className="alert alert-danger  mb-3">{error}</div>   : null}

      {/* Resource selector */}
      <DataCard title="Select resource">
        <form method="get" action="/availability-rules">
          <div className="row g-3 align-items-end">
            <div className="col-md-6">
              <label className="form-label">Resource</label>
              <select className="form-select" name="resource_id" defaultValue={resourceId}>
                <option value="">— choose a resource —</option>
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="col-auto">
              <button className="btn btn-secondary" type="submit">Load</button>
            </div>
          </div>
        </form>
      </DataCard>

      {resourceId && selectedResource ? (
        <>
          {/* Add rule */}
          <DataCard title={`Add availability rule — ${selectedResource.name}`}>
            <form action="/availability-rule-actions/create" method="post">
              <input type="hidden" name="resource_id" value={resourceId} />
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label">Day of week</label>
                  <select className="form-select" name="day_of_week" required>
                    {DAYS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">Open from</label>
                  <input className="form-control" type="time" name="start_time" required />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Open until</label>
                  <input className="form-control" type="time" name="end_time" required />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Slot duration (min)</label>
                  <input className="form-control" type="number" name="slot_duration_minutes" min="5" step="5" placeholder="e.g. 60" />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Slot interval (min)</label>
                  <input className="form-control" type="number" name="slot_interval_minutes" min="5" step="5" placeholder="e.g. 30" />
                </div>
                <div className="col-md-1 d-flex align-items-end">
                  <label className="form-check mb-2">
                    <input className="form-check-input" type="checkbox" name="is_open" defaultChecked />
                    <span className="form-check-label">Open</span>
                  </label>
                </div>
                <div className="col-12">
                  <p className="text-secondary small mb-2">
                    Leave slot duration blank for free booking mode (no fixed slots). Slot interval controls
                    how far apart slot start times are — leave blank to default to the same as duration.
                  </p>
                  <button className="btn btn-primary" type="submit">Add rule</button>
                </div>
              </div>
            </form>
          </DataCard>

          {/* Existing rules */}
          <DataCard title="Weekly schedule">
            <AvailabilityRulesList rules={rules} resourceId={resourceId} />
          </DataCard>

          {/* Add exception */}
          <DataCard title="Add date exception">
            <form action="/availability-exception-actions/create" method="post">
              <input type="hidden" name="resource_id" value={resourceId} />
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label">Date</label>
                  <input className="form-control" type="date" name="exception_date" required />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Open from</label>
                  <input className="form-control" type="time" name="start_time" />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Open until</label>
                  <input className="form-control" type="time" name="end_time" />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Note (optional)</label>
                  <input className="form-control" type="text" name="note" placeholder="e.g. Bank Holiday" />
                </div>
                <div className="col-md-2 d-flex align-items-end">
                  <label className="form-check mb-2">
                    <input className="form-check-input" type="checkbox" name="is_closed" />
                    <span className="form-check-label">Closed all day</span>
                  </label>
                </div>
                <div className="col-12">
                  <p className="text-secondary small mb-2">
                    Tick "Closed all day" to mark a full closure — times will be ignored.
                    Leave unticked and set times to override hours on a specific date.
                  </p>
                  <button className="btn btn-primary" type="submit">Add exception</button>
                </div>
              </div>
            </form>
          </DataCard>

          {/* Existing exceptions */}
          <DataCard title="Date exceptions">
            <AvailabilityExceptionsList exceptions={exceptions} resourceId={resourceId} />
          </DataCard>
        </>
      ) : resourceId && !selectedResource ? (
        <div className="alert alert-warning">Resource not found or you do not have access to it.</div>
      ) : (
        <div className="alert alert-info">Select a resource above to manage its availability rules.</div>
      )}
    </LayoutShell>
  );
}
