import LayoutShell from '../../../components/LayoutShell';
import DataCard from '../../../components/DataCard';
import FadeOut from '../../../components/FadeOut';
import DashboardCalendarClient from '../../../components/DashboardCalendarClient';
import { apiFetch, requireAuth } from '../../../lib/auth';
import { formatDateTime } from '../../../lib/format';

export const dynamic = 'force-dynamic';

function badgeClass(status) {
  if (status === 'confirmed') return 'bg-green-lt';
  if (status === 'cancelled') return 'bg-red-lt';
  return 'bg-yellow-lt';
}

async function load() {
  await requireAuth();
  const [resourcesRes, bookingsRes, tenantRes, blocksRes, subscriptionRes, entitlementRes] = await Promise.all([
    apiFetch('/api/resources'),
    apiFetch('/api/bookings?per_page=5'),
    apiFetch('/api/tenant/profile'),
    apiFetch('/api/unavailability-blocks'),
    apiFetch('/api/plans/subscription'),
    apiFetch('/api/entitlement'),
  ]);

  const resourcesRaw = resourcesRes.ok ? await resourcesRes.json() : [];
  const bookingsRaw  = bookingsRes.ok  ? await bookingsRes.json()  : {};

  const resources     = Array.isArray(resourcesRaw) ? resourcesRaw : (resourcesRaw.data || []);
  const bookings      = Array.isArray(bookingsRaw)  ? bookingsRaw  : (bookingsRaw.data  || []);
  const totalBookings = bookingsRaw?.pagination?.total_count ?? bookings.length;
  const blocksRaw     = blocksRes.ok ? await blocksRes.json() : [];
  const unavailabilityBlocks = Array.isArray(blocksRaw) ? blocksRaw : (blocksRaw.data || []);
  const tenant        = tenantRes.ok ? await tenantRes.json() : null;

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
  const hasAnyRules = Object.values(allRulesByResource).some(r => r.length > 0);

  const subscription = subscriptionRes.ok ? await subscriptionRes.json() : null;
  const entitlement  = entitlementRes.ok  ? await entitlementRes.json()  : null;

  return { resources, bookings, totalBookings, tenant, hasAnyRules, unavailabilityBlocks, allRulesByResource, subscription, entitlement };
}

function PlanHeaderCard({ entitlement }) {
  if (!entitlement) return null;

  const bpm       = entitlement.usage?.bookings_per_month;
  const status    = entitlement.subscriptionStatus;
  const planName  = entitlement.planName;
  const periodEnd = entitlement.periodEnd;

  const pct       = bpm?.limit ? Math.min(100, Math.round((bpm.current / bpm.limit) * 100)) : null;
  const barColour =
    pct == null   ? 'bg-primary' :
    pct >= 90     ? 'bg-danger'  :
    pct >= 70     ? 'bg-warning' : 'bg-primary';

  const statusLabel =
    status === 'trial'   ? 'Trial'        :
    status === 'grace'   ? 'Grace period' :
    status === 'active'  ? 'Active'       :
    status === 'expired' ? 'Expired'      : status;

  const statusColour =
    status === 'active'  ? 'bg-success-lt text-success' :
    status === 'trial'   ? 'bg-info-lt text-info'       :
    status === 'grace'   ? 'bg-warning-lt text-warning' :
                           'bg-secondary-lt text-secondary';

  const trialDaysLeft = status === 'trial' && periodEnd
    ? Math.max(0, Math.ceil((new Date(periodEnd) - new Date()) / 86400000))
    : null;

  return (
    <div className="card mb-0" style={{ minWidth: '360px', maxWidth: '380px' }}>
      <div className="card-body p-3">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div>
            <div className="text-secondary" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
              Current plan
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="fw-bold" style={{ fontSize: '0.95rem' }}>{planName ?? '—'}</span>
              <span className={`badge ${statusColour}`} style={{ fontSize: '0.65rem' }}>{statusLabel}</span>
            </div>
            {trialDaysLeft !== null && (
              <div className="text-secondary" style={{ fontSize: '0.7rem', marginTop: '2px' }}>
                {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left in trial
              </div>
            )}
          </div>
          <a href="/administration?tab=plans" className="btn btn-sm btn-outline-primary ms-3" style={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
            Upgrade
          </a>
        </div>
        {bpm && (
          <div>
            <div className="d-flex justify-content-between mb-1">
              <span className="text-secondary" style={{ fontSize: '0.7rem' }}>Bookings this month</span>
              <span className="text-secondary" style={{ fontSize: '0.7rem' }}>
                {bpm.current}{bpm.limit != null ? ` / ${bpm.limit}` : ''}
                {pct != null ? ` · ${pct}%` : ''}
              </span>
            </div>
            <div className="progress progress-sm mb-0">
              <div
                className={`progress-bar ${barColour}`}
                style={{ width: pct != null ? `${pct}%` : '0%' }}
                role="progressbar"
                aria-valuenow={bpm.current}
                aria-valuemin={0}
                aria-valuemax={bpm.limit ?? 100}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OnboardingChecklist({ tenant, resources, hasAnyRules }) {
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
      complete: hasAnyRules,
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

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default async function DashboardPage() {
  const { resources, bookings, totalBookings, tenant, hasAnyRules, unavailabilityBlocks, allRulesByResource, subscription, entitlement } = await load();

  const profileComplete  = Boolean(tenant?.display_name || tenant?.contact_email);
  const resourceComplete = resources.length > 0;
  const rulesComplete    = hasAnyRules;
  const bookingComplete  = Boolean(tenant?.public_booking_enabled);
  const allComplete      = profileComplete && resourceComplete && rulesComplete && bookingComplete;
  const hideChecklist    = allComplete;
  const todayStr    = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const todayBookings = bookings.filter(b => {
    const d = new Date(b.start_at);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
           d.getMonth()    === now.getMonth()    &&
           d.getDate()     === now.getDate();
  }).length;

  const subParts = [`${todayStr}.`];
  if (todayBookings === 0) {
    subParts.push('No bookings starting today.');
  } else {
    subParts.push(`${todayBookings} booking${todayBookings !== 1 ? 's' : ''} starting today.`);
  }
  if (!hideChecklist) subParts.push('Complete setup to go live.');

  const subtitle = subParts.join('  ·  ');

  return (
    <LayoutShell
      title={`${greeting()}, ${tenant?.display_name || 'there'}.`}
      subtitle={subtitle}
      headerAction={<PlanHeaderCard entitlement={entitlement} />}
    >
      {!hideChecklist && (
        <OnboardingChecklist
          tenant={tenant}
          resources={resources}
          hasAnyRules={hasAnyRules}
        />
      )}

      <div className="row mb-4">
        <div className="col-12">
          <DashboardCalendarClient
            unavailabilityBlocks={unavailabilityBlocks}
            resources={resources}
            availabilityRulesByResource={allRulesByResource}
            showResourceSelector={resources.length > 1 && subscription?.plan_code !== 'solo'}
          />
        </div>
      </div>

      <div className="row row-deck row-cards">
        <div className="col-12">
          <DataCard
            title="Recent bookings"
            footer={<a href="/bookings">View all bookings →</a>}
            headerStyle={{ backgroundColor: '#1e2a78', color: '#ffffff' }}
          >
            <div className="table-responsive">
              <table className="table table-vcenter">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Booked</th>
                    <th>Status</th>
                    <th>Start</th>
                    <th>End</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 ? (
                    <tr><td colSpan="6" className="text-secondary">No bookings yet.</td></tr>
                  ) : bookings.slice(0, 5).map((row) => (
                    <tr key={row.id}>
                      <td>{row.customer_name || <span className="text-secondary">—</span>}</td>
                      <td>{formatDateTime(row.created_at)}</td>
                      <td>
                        <span className={`badge ${badgeClass(row.status)}`}>
                          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                        </span>
                      </td>
                      <td>{formatDateTime(row.start_at)}</td>
                      <td>{formatDateTime(row.end_at)}</td>
                      <td>
                        <a href={`/bookings?booking_id=${row.id}`} className="btn btn-sm btn-outline-primary">View</a>
                      </td>
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
