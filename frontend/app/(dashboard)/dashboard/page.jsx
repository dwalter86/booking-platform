import LayoutShell from '../../../components/LayoutShell';
import DataCard from '../../../components/DataCard';
import FadeOut from '../../../components/FadeOut';
import { apiFetch, requireAuth } from '../../../lib/auth';
import { formatDateTime } from '../../../lib/format';

export const dynamic = 'force-dynamic';

const STATUS_BADGE = {
  confirmed:   'bg-success',
  cancelled:   'bg-danger',
  canceled:    'bg-danger',
  pending:     'bg-warning',
  rejected:    'bg-danger',
  provisional: 'bg-secondary',
};

async function load() {
  await requireAuth();
  const [resourcesRes, bookingsRes, plansRes, tenantRes] = await Promise.all([
    apiFetch('/api/resources'),
    apiFetch('/api/bookings?per_page=5'),
    apiFetch('/api/plans/entitlements'),
    apiFetch('/api/tenant/profile'),
  ]);

  const resourcesRaw = resourcesRes.ok ? await resourcesRes.json() : [];
  const bookingsRaw  = bookingsRes.ok  ? await bookingsRes.json()  : {};

  const resources    = Array.isArray(resourcesRaw) ? resourcesRaw : (resourcesRaw.data || []);
  const bookings     = Array.isArray(bookingsRaw)  ? bookingsRaw  : (bookingsRaw.data  || []);
  const totalBookings = bookingsRaw?.pagination?.total_count ?? bookings.length;
  const entitlements = plansRes.ok ? await plansRes.json() : {};
  const tenant       = tenantRes.ok ? await tenantRes.json() : null;

  let rules = [];
  if (resources.length > 0) {
    const rulesRes = await apiFetch(`/api/availability-rules?resource_id=${resources[0].id}`);
    const rulesRaw = rulesRes.ok ? await rulesRes.json() : [];
    rules = Array.isArray(rulesRaw) ? rulesRaw : (rulesRaw.data || []);
  }

  return { resources, bookings, totalBookings, entitlements, tenant, rules };
}

function OnboardingChecklist({ tenant, resources, rules }) {
  const steps = [
    {
      key:      'profile',
      label:    'Complete your profile',
      detail:   'Add your business name and contact email',
      href:     '/settings',
      complete: Boolean(tenant?.display_name || tenant?.contact_email),
    },
    {
      key:      'resource',
      label:    'Create your first resource',
      detail:   'Set up a bookable asset (room, court, equipment, etc.)',
      href:     '/resources',
      complete: resources.length > 0,
    },
    {
      key:      'rules',
      label:    'Configure availability rules',
      detail:   'Define when your resource is open for bookings',
      href:     '/availability-rules',
      complete: rules.length > 0,
    },
    {
      key:      'booking',
      label:    'Enable public booking',
      detail:   'Open your booking page to the public',
      href:     '/settings',
      complete: Boolean(tenant?.public_booking_enabled),
    },
  ];

  const completedCount = steps.filter(s => s.complete).length;
  const allComplete    = completedCount === steps.length;

  const inner = (
    <div className="card mb-4">
      <div className="card-header">
        <h3 className="card-title">
          {allComplete ? '✓ Setup complete' : `Getting started (${completedCount}/${steps.length})`}
        </h3>
        {!allComplete && (
          <div className="card-subtitle">
            Complete these steps to get your booking platform ready
          </div>
        )}
      </div>
      <div className="card-body">
        {allComplete ? (
          <div className="text-success d-flex align-items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none">
              <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
              <path d="M5 12l5 5l10 -10" />
            </svg>
            Your platform is set up and ready to accept bookings.
          </div>
        ) : (
          <div className="divide-y">
            {steps.map((step) => (
              <div key={step.key} className="row align-items-center py-2">
                <div className="col-auto">
                  {step.complete ? (
                    <span className="badge bg-success-lt p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-sm text-success" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                        <path d="M5 12l5 5l10 -10" />
                      </svg>
                    </span>
                  ) : (
                    <span className="badge bg-secondary-lt p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-sm text-secondary" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                    </span>
                  )}
                </div>
                <div className="col">
                  <div className={step.complete ? 'text-secondary text-decoration-line-through' : 'fw-medium'}>
                    {step.label}
                  </div>
                  {!step.complete && (
                    <div className="text-secondary small">{step.detail}</div>
                  )}
                </div>
                {!step.complete && (
                  <div className="col-auto">
                    <a href={step.href} className="btn btn-sm btn-outline-primary">Go →</a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (allComplete) {
    return <FadeOut delay={4000}>{inner}</FadeOut>;
  }
  return inner;
}

export default async function DashboardPage() {
  const { resources, bookings, totalBookings, entitlements, tenant, rules } = await load();

  const profileComplete  = Boolean(tenant?.display_name || tenant?.contact_email);
  const resourceComplete = resources.length > 0;
  const rulesComplete    = rules.length > 0;
  const bookingComplete  = Boolean(tenant?.public_booking_enabled);
  const allComplete      = profileComplete && resourceComplete && rulesComplete && bookingComplete;
  const hideChecklist    = allComplete && totalBookings > 5;

  return (
    <LayoutShell title="Dashboard">
      {!hideChecklist && (
        <OnboardingChecklist
          tenant={tenant}
          resources={resources}
          rules={rules}
        />
      )}

      <div className="row row-deck row-cards">
        <div className="col-md-4">
          <DataCard title="Resources">
            <div className="d-flex align-items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-lg text-muted" width="32" height="32" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M3 21l18 0" /><path d="M9 8l1 0" /><path d="M9 12l1 0" /><path d="M9 16l1 0" /><path d="M14 8l1 0" /><path d="M14 12l1 0" /><path d="M14 16l1 0" />
                <path d="M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16" />
              </svg>
              <div>
                <div className="h1 mb-0">{resources.length}</div>
                <div className="text-secondary small">bookable assets</div>
              </div>
            </div>
          </DataCard>
        </div>
        <div className="col-md-4">
          <DataCard title="Bookings">
            <div className="d-flex align-items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-lg text-muted" width="32" height="32" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M4 5m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" />
                <path d="M16 3l0 4" /><path d="M8 3l0 4" /><path d="M4 11l16 0" />
                <path d="M8 15l2 0" /><path d="M14 15l2 0" />
              </svg>
              <div>
                <div className="h1 mb-0">{totalBookings}</div>
                <div className="text-secondary small">total bookings</div>
              </div>
            </div>
          </DataCard>
        </div>
        <div className="col-md-4">
          <DataCard title="Current plan">
            <div className="d-flex align-items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-lg text-muted" width="32" height="32" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M3 9a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9z" />
                <path d="M8 7v-2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <div>
                <div className="h3 mb-0">{entitlements?.subscription?.plan_name || 'Unknown'}</div>
                <div className="text-secondary small"><a href="/plans">View plan details</a></div>
              </div>
            </div>
          </DataCard>
        </div>
        <div className="col-12">
          <DataCard
            title="Recent bookings"
            footer={<a href="/bookings">View all bookings →</a>}
          >
            <div className="table-responsive">
              <table className="table table-vcenter">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Start</th>
                    <th>End</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 ? (
                    <tr><td colSpan="5" className="text-secondary">No bookings yet.</td></tr>
                  ) : bookings.map((row) => (
                    <tr key={row.id}>
                      <td className="text-monospace">{row.reference_code || row.id}</td>
                      <td>{row.customer_name || <span className="text-secondary">—</span>}</td>
                      <td>
                        <span className={`badge text-white ${STATUS_BADGE[row.status] ?? 'bg-secondary'}`}>
                          {row.status}
                        </span>
                      </td>
                      <td>{formatDateTime(row.start_at)}</td>
                      <td>{formatDateTime(row.end_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataCard>
        </div>
      </div>
    </LayoutShell>
  );
}
