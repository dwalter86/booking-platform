'use client';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AvailabilityRulesList({ rules, resourceId, returnBase }) {
  if (!Array.isArray(rules) || !rules.length) {
    return <p className="text-secondary mb-0">No availability rules yet. Use the form above to add the first rule.</p>;
  }

  return (
    <div className="d-flex flex-column gap-3">
      {rules.map((rule) => (
        <div className="card" key={rule.id}>
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div>
                <h4 className="card-title mb-1">
                  {DAYS[rule.day_of_week]} &nbsp;
                  <span className="text-secondary fw-normal">
                    {rule.start_time?.slice(0, 5)} – {rule.end_time?.slice(0, 5)}
                  </span>
                </h4>
                <div className="text-secondary small">
                  {rule.slot_duration_minutes
                    ? `${rule.slot_duration_minutes} min slots`
                    : 'Free booking window'}
                  {rule.slot_interval_minutes && rule.slot_interval_minutes !== rule.slot_duration_minutes
                    ? ` · every ${rule.slot_interval_minutes} min`
                    : ''}
                  {' · '}
                  {rule.is_open ? (
                    <span className="text-success">Open</span>
                  ) : (
                    <span className="text-danger">Closed</span>
                  )}
                </div>
              </div>
              <form action="/availability-rule-actions/delete" method="post">
                <input type="hidden" name="id" value={rule.id} />
                <input type="hidden" name="resource_id" value={resourceId} />
                {returnBase && <input type="hidden" name="return_base" value={returnBase} />}
                <button className="btn btn-outline-danger btn-sm" type="submit">Delete</button>
              </form>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
