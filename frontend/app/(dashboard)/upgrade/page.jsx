import LayoutShell from '../../../components/LayoutShell';
import { apiFetch, requireAuth } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

function limitDisplay(value) {
  if (value === null || value === undefined) return '∞';
  return Number(value).toLocaleString();
}

function getLimit(limits, planId, metricKey) {
  const row = limits.find(l => l.plan_id === planId && l.metric_key === metricKey);
  return row ? row.limit_value : null;
}

function getFeature(features, planId, featureKey) {
  const row = features.find(f => f.plan_id === planId && f.feature_key === featureKey);
  return row ? row.is_enabled : false;
}

export default async function UpgradePage() {
  await requireAuth();

  const [catalogueRes, subscriptionRes] = await Promise.all([
    apiFetch('/api/plans/catalogue'),
    apiFetch('/api/plans/subscription'),
  ]);

  const catalogueData = catalogueRes.ok ? await catalogueRes.json() : { plans: [], limits: [], features: [] };
  const subscription  = subscriptionRes.ok ? await subscriptionRes.json() : null;

  const plans    = catalogueData.plans    || [];
  const limits   = catalogueData.limits   || [];
  const features = catalogueData.features || [];

  // Exclude trial and enterprise from the purchasable plans
  const visiblePlans = plans.filter(p => p.code !== 'trial' && p.code !== 'enterprise');

  const prices = {
    solo:     'Free',
    business: '£29 / month',
    pro:      '£69 / month',
  };

  const comparisonFeatures = [
    ['All booking modes',        'booking_mode_hybrid'],
    ['Availability rules',       'availability_rules'],
    ['Calendar integrations',    'calendar_integrations'],
    ['Email notifications',      'email_notifications_full'],
    ['Custom branding',          'custom_branding'],
    ['Remove Availio branding',  'remove_availio_branding'],
    ['Own domain',               'own_domain'],
    ['API access',               'api_access'],
    ['Webhooks',                 'webhooks'],
    ['Audit log',                'audit_log_access'],
    ['Advanced reporting',       'advanced_reporting'],
    ['Advanced policy controls', 'advanced_policy_controls'],
  ];

  return (
    <LayoutShell title="Upgrade your plan" headerAction={
      <a href="/administration?tab=plans" className="btn btn-sm btn-outline-secondary">
        ← Back to plans
      </a>
    }>
      {/* Plan cards */}
      <div className="row row-deck row-cards mb-4">
        {visiblePlans.map(plan => {
          const isCurrent = subscription?.plan_code === plan.code;
          return (
            <div className="col-md-4" key={plan.code}>
              <div className={`card h-100 ${isCurrent ? 'border-primary' : ''}`}>
                <div className="card-header">
                  <div className="d-flex align-items-center justify-content-between w-100">
                    <h3 className="card-title mb-0">{plan.name}</h3>
                    {isCurrent && (
                      <span className="badge bg-primary-lt">Current plan</span>
                    )}
                  </div>
                </div>
                <div className="card-body">
                  <div className="display-6 fw-bold mb-1">{prices[plan.code] || '—'}</div>
                  {plan.description && (
                    <p className="text-secondary small mb-3">{plan.description}</p>
                  )}
                  <ul className="list-unstyled mb-0">
                    {['resources_count', 'admin_users_count', 'calendar_connections_count', 'bookings_per_month'].map(metric => {
                      const val = getLimit(limits, plan.id, metric);
                      const labels = {
                        resources_count:            'Resources',
                        admin_users_count:          'Admin users',
                        calendar_connections_count: 'Calendar connections',
                        bookings_per_month:         'Bookings / month',
                      };
                      return (
                        <li key={metric} className="d-flex justify-content-between py-1 border-bottom">
                          <span className="text-secondary">{labels[metric]}</span>
                          <span className="fw-medium">{limitDisplay(val)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="card-footer">
                  {isCurrent ? (
                    <button className="btn btn-outline-secondary w-100" disabled>
                      Current plan
                    </button>
                  ) : plan.code === 'solo' ? (
                    <button className="btn btn-outline-secondary w-100" disabled>
                      Free — no action needed
                    </button>
                  ) : (
                    <button className="btn btn-primary w-100" disabled>
                      Coming soon — payment via Mollie
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Enterprise callout */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col">
              <h3 className="mb-1">Enterprise</h3>
              <p className="text-secondary mb-0">
                Custom limits, SAML/SSO, dedicated infrastructure, SLA, and white-label reseller rights.
                Tailored pricing for your organisation.
              </p>
            </div>
            <div className="col-auto">
              <a
                href="mailto:hello@myavailio.com?subject=Enterprise%20enquiry"
                className="btn btn-outline-primary"
              >
                Contact us
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Feature comparison */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title mb-0">Full feature comparison</h3>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-vcenter mb-0">
              <thead>
                <tr>
                  <th style={{ width: '35%' }}>Feature</th>
                  {visiblePlans.map(p => (
                    <th key={p.code} className="text-center">
                      {p.name}
                      {subscription?.plan_code === p.code && (
                        <span className="badge bg-primary-lt ms-1 fw-normal"
                          style={{ fontSize: '0.65rem' }}>current</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
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
        </div>
      </div>
    </LayoutShell>
  );
}
