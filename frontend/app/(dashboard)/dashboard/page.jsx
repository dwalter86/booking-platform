import LayoutShell from '../../../components/LayoutShell';
import DataCard from '../../../components/DataCard';
import FadeOut from '../../../components/FadeOut';
import DashboardCalendarClient from '../../../components/DashboardCalendarClient';
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
  const [resourcesRes, bookingsRes, tenantRes, blocksRes] = await Promise.all([
    apiFetch('/api/resources'),
    apiFetch('/api/bookings'),
    apiFetch('/api/tenant/profile'),
    apiFetch('/api/unavailability-blocks'),
  ]);

  const resourcesRaw = resourcesRes.ok ? await resourcesRes.json() : [];
  const bookingsRaw  = bookingsRes.ok  ? await bookingsRes.json()  : {};

  const resources    = Array.isArray(resourcesRaw) ? resourcesRaw : (resourcesRaw.data || []);
  const bookings     = Array.isArray(bookingsRaw)  ? bookingsRaw  : (bookingsRaw.data  || []);
  const totalBookings = bookingsRaw?.pagination?.total_count ?? bookings.length;
  const blocksRaw    = blocksRes.ok ? await blocksRes.json() : [];
  const unavailabilityBlocks = Array.isArray(blocksRaw) ? blocksRaw : (blocksRaw.data || []);
  const tenant       = tenantRes.ok ? await tenantRes.json() : null;

  const allRulesByResource = {};
  if (resources.length > 0) {
    const rulesResults = await Promise.all(
      resources.map(r => apiFetch(`/api/availability-rules?resource_id=${r.id}`))
    );
    for (let i = 0; i < resources.length; i++) {
      const raw = rulesResults[i].ok ? await rulesResults[i].json() : [];
      allRulesByResource[resources[i].id] = Array.isArray(raw) ? raw : (raw.data || []);
    }
  }
  const rules = allRulesByResource[resources[0]?.id] || [];

  return { resources, bookings, totalBookings, tenant, rules, unavailabilityBlocks, allRulesByResource };
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
  const { resources, bookings, totalBookings, tenant, rules, unavailabilityBlocks, allRulesByResource } = await load();

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

      <div className="row mb-4">
        <div className="col-12">
          <DashboardCalendarClient bookings={bookings} unavailabilityBlocks={unavailabilityBlocks} resources={resources} availabilityRulesByResource={allRulesByResource} />
        </div>
      </div>

      <div className="row row-deck row-cards">
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
                  ) : bookings.slice(0, 5).map((row) => (
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
