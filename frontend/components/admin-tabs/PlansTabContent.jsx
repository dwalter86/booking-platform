import DataCard from '../DataCard';

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status) {
  if (status === 'trial')    return <span className="badge bg-info    text-white">Trial</span>;
  if (status === 'grace')    return <span className="badge bg-warning text-white">Grace period</span>;
  if (status === 'active')   return <span className="badge bg-success text-white">Active</span>;
  if (status === 'past_due') return <span className="badge bg-danger  text-white">Past due</span>;
  if (status === 'cancelled')return <span className="badge bg-secondary text-white">Cancelled</span>;
  return <span className="badge bg-secondary text-white">{status || 'Unknown'}</span>;
}

function periodLabel(status) {
  if (status === 'trial') return 'Trial ends';
  if (status === 'grace') return 'Grace period ends';
  return 'Current period ends';
}

// Lookup limit value for a metric from catalogue limits array
function getLimit(limits, planId, metricKey) {
  const row = limits.find(l => l.plan_id === planId && l.metric_key === metricKey);
  return row ? row.limit_value : null;
}

// Lookup feature enabled state from catalogue features array
function getFeature(features, planId, featureKey) {
  const row = features.find(f => f.plan_id === planId && f.feature_key === featureKey);
  return row ? row.is_enabled : false;
}

// Format a metric key into a readable label
function metricLabel(key) {
  const labels = {
    resources_count:            'Resources',
    admin_users_count:          'Admin users',
    calendar_connections_count: 'Calendar connections',
    bookings_per_month:         'Bookings / month',
    api_calls_per_month:        'API calls / month',
  };
  return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function limitDisplay(value) {
  if (value === null || value === undefined) return '∞';
  return Number(value).toLocaleString();
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PlansTabContent({ catalogue, entitlements, subscription }) {
  const plans    = catalogue?.plans    || [];
  const limits   = catalogue?.limits   || [];
  const features = catalogue?.features || [];

  const sub     = subscription || entitlements?.subscription || null;
  const status  = sub?.status  || null;
  const periodEnd = sub?.current_period_end || null;

  // Current plan limits keyed by metric_key — from entitlements (the live resolved values)
  const currentLimits  = entitlements?.limits  || {};
  const currentUsage   = entitlements?.usage   || {};

  // The metrics we show in usage
  const usageMetrics = [
    'resources_count',
    'admin_users_count',
    'calendar_connections_count',
    'bookings_per_month',
    'api_calls_per_month',
  ];

  // Features to show in comparison table (display label, feature_key)
  const comparisonFeatures = [
    ['All booking modes',              'booking_mode_hybrid'],
    ['Availability rules',             'availability_rules'],
    ['Calendar integrations',          'calendar_integrations'],
    ['Email notifications',            'email_notifications_full'],
    ['Custom branding',                'custom_branding'],
    ['Remove Availio branding',        'remove_availio_branding'],
    ['Own domain',                     'own_domain'],
    ['API access',                     'api_access'],
    ['Webhooks',                       'webhooks'],
    ['Audit log',                      'audit_log_access'],
    ['Advanced reporting',             'advanced_reporting'],
    ['Advanced policy controls',       'advanced_policy_controls'],
    ['SAML / SSO',                     'saml_sso'],
    ['SCIM provisioning',              'scim_provisioning'],
    ['SLA support',                    'sla_support'],
  ];

  // Visible plans in comparison — exclude trial
  const visiblePlans = plans.filter(p => p.code !== 'trial');

  return (
    <>
      {/* ── Current subscription ─────────────────────────────────────────── */}
      <DataCard title="Your subscription">
        <div className="row g-3 align-items-center">
          <div className="col-md-3">
            <div className="subheader mb-1">Plan</div>
            <div className="fw-bold fs-5">{sub?.plan_name || '—'}</div>
          </div>
          <div className="col-md-3">
            <div className="subheader mb-1">Status</div>
            {statusBadge(status)}
          </div>
          <div className="col-md-3">
            <div className="subheader mb-1">{periodLabel(status)}</div>
            <div>
              {periodEnd
                ? new Date(periodEnd).toLocaleDateString('en-GB')
                : '—'}
            </div>
          </div>
          <div className="col-md-3 text-md-end">
            <a href="mailto:hello@myavailio.com?subject=Upgrade%20enquiry" className="btn btn-primary btn-sm">
              Contact us to upgrade
            </a>
          </div>
        </div>

        {status === 'trial' && (
          <div className="alert alert-info mt-3 mb-0">
            You are on a free trial. Upgrade before your trial ends to keep full access.
          </div>
        )}
        {status === 'grace' && (
          <div className="alert alert-warning mt-3 mb-0">
            Your trial has ended. You are in a grace period — upgrade now to avoid losing access.
          </div>
        )}
      </DataCard>

      {/* ── Usage this period ────────────────────────────────────────────── */}
      <DataCard title="Usage this period">
        <div className="row g-3">
          {usageMetrics.map(metric => {
            // Limits are stored as "metric_key:period" in entitlements
            const absoluteKey = `${metric}:absolute`;
            const monthlyKey  = `${metric}:monthly`;
            const limitValue  = currentLimits[absoluteKey] ?? currentLimits[monthlyKey] ?? null;
            const usageStat   = currentUsage[metric];
            const current     = usageStat ? Number(usageStat.usage_value) : 0;
            const pct         = limitValue != null ? Math.min(100, (current / Number(limitValue)) * 100) : 0;

            return (
              <div className="col-sm-6 col-lg-4" key={metric}>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-secondary small">{metricLabel(metric)}</span>
                  <span className="small fw-medium">
                    {current.toLocaleString()}
                    <span className="text-secondary fw-normal">
                      {' / '}{limitDisplay(limitValue)}
                    </span>
                  </span>
                </div>
                {limitValue != null && (
                  <div className="progress" style={{ height: 4 }}>
                    <div
                      className={`progress-bar ${
                        pct > 90 ? 'bg-danger' :
                        pct > 70 ? 'bg-warning' : 'bg-success'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DataCard>

      {/* ── Plan comparison ──────────────────────────────────────────────── */}
      <DataCard title="Plan comparison">
        <div className="table-responsive">
          <table className="table table-vcenter">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Feature</th>
                {visiblePlans.map(p => (
                  <th key={p.code} className="text-center">
                    {p.name}
                    {sub?.plan_code === p.code && (
                      <span className="badge bg-primary ms-1 fw-normal" style={{ fontSize: '0.65rem' }}>
                        current
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Hard limits rows */}
              {['resources_count', 'admin_users_count', 'calendar_connections_count', 'bookings_per_month'].map(metric => (
                <tr key={metric}>
                  <td className="text-secondary">{metricLabel(metric)}</td>
                  {visiblePlans.map(p => (
                    <td key={p.code} className="text-center">
                      {p.code === 'enterprise'
                        ? <span className="text-secondary">Custom</span>
                        : limitDisplay(getLimit(limits, p.id, metric))
                      }
                    </td>
                  ))}
                </tr>
              ))}

              {/* Divider */}
              <tr>
                <td colSpan={visiblePlans.length + 1} className="bg-light py-1">
                  <span className="text-secondary small">Features</span>
                </td>
              </tr>

              {/* Feature flag rows */}
              {comparisonFeatures.map(([label, key]) => (
                <tr key={key}>
                  <td className="text-secondary">{label}</td>
                  {visiblePlans.map(p => (
                    <td key={p.code} className="text-center">
                      {getFeature(features, p.id, key)
                        ? <span className="text-success">✓</span>
                        : <span className="text-muted">—</span>
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataCard>
    </>
  );
}
