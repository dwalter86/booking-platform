import LayoutShell from '../../../components/LayoutShell';
import DataCard from '../../../components/DataCard';
import { apiFetch, requireAuth } from '../../../lib/auth';
import { formatDateTime } from '../../../lib/format';

export const dynamic = 'force-dynamic';

async function load() {
  await requireAuth();
  const [resourcesRes, bookingsRes, plansRes, tenantRes] = await Promise.all([
    apiFetch('/api/resources'),
    apiFetch('/api/bookings'),
    apiFetch('/api/plans/entitlements'),
    apiFetch('/api/tenant/profile'),
  ]);

  const resourcesRaw = resourcesRes.ok ? await resourcesRes.json() : [];
  const bookingsRaw  = bookingsRes.ok  ? await bookingsRes.json()  : [];

  const resources    = Array.isArray(resourcesRaw) ? resourcesRaw : (resourcesRaw.data || []);
  const bookings     = Array.isArray(bookingsRaw)  ? bookingsRaw  : (bookingsRaw.data  || []);
  const entitlements = plansRes.ok ? await plansRes.json() : {};
  const tenant       = tenantRes.ok ? await tenantRes.json() : null;

  // Check if any resource has availability rules configured
  // Only fetch if we have at least one resource
  let rules = [];
  if (resources.length > 0) {
    const rulesRes = await apiFetch(`/api/availability-rules?resource_id=${resources[0].id}`);
    const rulesRaw = rulesRes.ok ? await rulesRes.json() : [];
    rules = Array.isArray(rulesRaw) ? rulesRaw : (rulesRaw.data || []);
  }

  return { resources, bookings, entitlements, tenant, rules };
}

function OnboardingChecklist({ tenant, resources, rules }) {
  const steps = [
    {
      key:       'profile',
      label:     'Complete your profile',
      detail:    'Add your business name and contact email',
      href:      '/settings',
      complete:  Boolean(tenant?.display_name || tenant?.contact_email),
    },
    {
      key:       'resource',
      label:     'Create your first resource',
      detail:    'Set up a bookable asset (room, court, equipment, etc.)',
      href:      '/resources',
      complete:  resources.length > 0,
    },
    {
      key:       'rules',
      label:     'Configure availability rules',
      detail:    'Define when your resource is open for bookings',
      href:      '/availability-rules',
      complete:  rules.length > 0,
    },
    {
      key:       'booking',
      label:     'Enable public booking',
      detail:    'Open your booking page to the public',
      href:      '/settings',
      complete:  Boolean(tenant?.public_booking_enabled),
    },
  ];

  const completedCount = steps.filter(s => s.complete).length;
  const allComplete    = completedCount === steps.length;

  // Don't show if all steps were already complete before this session
  // (inferred: if resources exist and rules exist and profile is set, likely not a new tenant)
  // We show the checklist until all 4 are done, then show completion message
  return (
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
          <div
            className="text-success d-flex align-items-center gap-2"
            suppressHydrationWarning
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none">
              <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
              <path d="M5 12l5 5l10 -10" />
            </svg>
            Your platform is set up and ready to accept bookings. This message will disappear shortly.
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
                    <a href={step.href} className="btn btn-sm btn-outline-primary">
                      Go →
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {allComplete && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var card = document.currentScript.closest('.card');
                if (card) {
                  setTimeout(function() {
                    card.style.transition = 'opacity 1s ease';
                    card.style.opacity = '0';
                    setTimeout(function() { card.style.display = 'none'; }, 1000);
                  }, 4000);
                }
              })();
            `,
          }}
        />
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const { resources, bookings, entitlements, tenant, rules } = await load();
  const recentBookings = Array.isArray(bookings) ? bookings.slice(0, 5) : [];

  // Show checklist only if setup is not fully complete
  const profileComplete  = Boolean(tenant?.display_name || tenant?.contact_email);
  const resourceComplete = resources.length > 0;
  const rulesComplete    = rules.length > 0;
  const bookingComplete  = Boolean(tenant?.public_booking_enabled);
  const allComplete      = profileComplete && resourceComplete && rulesComplete && bookingComplete;

  // Hide checklist entirely once setup has been complete for a while
  // (if all steps done and there are actual bookings, no need to show it)
  const hideChecklist = allComplete && bookings.length > 5;

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
            <div className="h1 mb-0">{resources.length}</div>
          </DataCard>
        </div>
        <div className="col-md-4">
          <DataCard title="Bookings">
            <div className="h1 mb-0">{Array.isArray(bookings) ? bookings.length : 0}</div>
          </DataCard>
        </div>
        <div className="col-md-4">
          <DataCard title="Current plan">
            <div className="h3 mb-0">{entitlements?.subscription?.plan_name || 'Unknown'}</div>
          </DataCard>
        </div>
        <div className="col-12">
          <DataCard title="Recent bookings">
            <div className="table-responsive">
              <table className="table table-vcenter">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Status</th>
                    <th>Start</th>
                    <th>End</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.length === 0 ? (
                    <tr><td colSpan="4">No bookings found.</td></tr>
                  ) : recentBookings.map((row) => (
                    <tr key={row.id}>
                      <td>{row.reference_code || row.id}</td>
                      <td>{row.status}</td>
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
