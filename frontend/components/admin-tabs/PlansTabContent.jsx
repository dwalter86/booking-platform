import DataCard from '../DataCard';

function statusBadge(state, subscriptionStatus) {
  if (state === 'trial_active')  return <span className="badge bg-info text-white">Trial</span>;
  if (state === 'trial_grace')   return <span className="badge bg-warning text-white">Grace period</span>;
  if (state === 'active')        return <span className="badge bg-success text-white">Active</span>;
  if (subscriptionStatus === 'past_due')   return <span className="badge bg-danger text-white">Past due</span>;
  if (subscriptionStatus === 'cancelled')  return <span className="badge bg-secondary text-white">Cancelled</span>;
  if (subscriptionStatus === 'expired')    return <span className="badge bg-danger text-white">Expired</span>;
  return <span className="badge bg-secondary text-white">{subscriptionStatus || 'Unknown'}</span>;
}

function periodLabel(subscriptionStatus) {
  if (subscriptionStatus === 'trial') return 'Trial ends';
  if (subscriptionStatus === 'grace') return 'Grace period ends';
  return 'Renews';
}

export default function PlansTabContent({ catalogue, entitlements, subscription }) {
  const state     = entitlements?.state  || null;
  const period    = entitlements?.periodEnd || null;
  const grace     = entitlements?.graceDaysRemaining || null;
  const usage     = entitlements?.usage  || null;
  const subStatus = entitlements?.subscriptionStatus || subscription?.status || null;

  return (
    <>
      {/* Current subscription */}
      <DataCard title="Subscription">
        <div className="row g-3">
          <div className="col-md-3">
            <div className="subheader mb-1">Plan</div>
            <div className="fw-bold">{entitlements?.planName || '—'}</div>
          </div>
          <div className="col-md-3">
            <div className="subheader mb-1">Status</div>
            {statusBadge(state, subStatus)}
          </div>
          <div className="col-md-3">
            <div className="subheader mb-1">{periodLabel(subStatus)}</div>
            <div>
              {period
                ? new Date(period).toLocaleDateString('en-GB')
                : '—'}
            </div>
          </div>
          {grace && (
            <div className="col-md-3">
              <div className="subheader mb-1">Grace period</div>
              <div className="text-warning fw-bold">{grace} days remaining</div>
            </div>
          )}
        </div>

        {state === 'trial_grace' && (
          <div className="alert alert-warning mt-3 mb-0">
            Your trial has ended. Upgrade before your grace period expires to keep access.
          </div>
        )}

        <div className="mt-3">
          <a href="mailto:hello@availio.co" className="btn btn-primary btn-sm me-2">
            Upgrade plan
          </a>
          <button className="btn btn-outline-secondary btn-sm" disabled>
            View plans
          </button>
        </div>
      </DataCard>

      {/* Usage */}
      {usage && (
        <DataCard title="Usage this period">
          <div className="row g-3">
            {Object.entries(usage).map(([key, stat]) => (
              <div className="col-md-3" key={key}>
                <div className="text-secondary small mb-1">
                  {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </div>
                <div className="fw-medium">
                  {stat.current}
                  {stat.limit != null
                    ? <span className="text-secondary fw-normal"> / {stat.limit}</span>
                    : <span className="text-secondary fw-normal"> / ∞</span>
                  }
                </div>
                {stat.limit != null && (
                  <div className="progress mt-1" style={{ height: 4 }}>
                    <div
                      className={`progress-bar ${
                        stat.current / stat.limit > 0.9 ? 'bg-danger' :
                        stat.current / stat.limit > 0.7 ? 'bg-warning' : 'bg-success'
                      }`}
                      style={{ width: `${Math.min(100, (stat.current / stat.limit) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </DataCard>
      )}
    </>
  );
}
