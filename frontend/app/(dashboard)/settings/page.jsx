import LayoutShell from '../../../components/LayoutShell';
import DataCard from '../../../components/DataCard';
import { apiFetch, requireAuth } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

function asValue(value, fallback = '') {
  return value === null || value === undefined ? fallback : String(value);
}

export default async function SettingsPage({ searchParams }) {
  await requireAuth();

  const [tenantRes, entitlementRes, resourcesRes, bookingsRes] = await Promise.all([
    apiFetch('/api/tenant/profile'),
    apiFetch('/api/entitlement'),
    apiFetch('/api/resources'),
    apiFetch('/api/bookings'),
  ]);

  const tenant      = tenantRes.ok      ? await tenantRes.json()      : null;
  const entitlement = entitlementRes.ok ? await entitlementRes.json() : null;
  const resourcesRaw  = resourcesRes.ok  ? await resourcesRes.json()  : [];
  const bookingsRaw   = bookingsRes.ok   ? await bookingsRes.json()   : {};
  const resourceCount = (Array.isArray(resourcesRaw) ? resourcesRaw : (resourcesRaw.data || [])).length;
  const totalBookings = bookingsRaw?.pagination?.total_count ?? (Array.isArray(bookingsRaw) ? bookingsRaw.length : (bookingsRaw.data?.length ?? 0));

  const success = searchParams?.success || '';
  const error   = searchParams?.error   || '';

  if (!tenant) {
    return (
      <LayoutShell title="Settings">
        <div className="alert alert-danger">Unable to load tenant profile.</div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell title="Settings">
      {success ? <div className="alert alert-success mb-4">{success}</div> : null}
      {error   ? <div className="alert alert-danger  mb-4">{error}</div>   : null}

      <div className="row row-deck row-cards mb-4">
        <div className="col-md-4">
          <DataCard title="Resources">
            <div className="d-flex align-items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-lg text-muted" width="32" height="32" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M3 21l18 0" /><path d="M9 8l1 0" /><path d="M9 12l1 0" /><path d="M9 16l1 0" /><path d="M14 8l1 0" /><path d="M14 12l1 0" /><path d="M14 16l1 0" />
                <path d="M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16" />
              </svg>
              <div>
                <div className="h1 mb-0">{resourceCount}</div>
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
                <div className="h3 mb-0">{entitlement?.planName || 'Unknown'}</div>
                <div className="text-secondary small"><a href="/plans">View plan details</a></div>
              </div>
            </div>
          </DataCard>
        </div>
      </div>

      {/* Profile */}
      <DataCard title="Business profile">
        <form action="/settings-actions/update" method="post">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Business name</label>
              <input className="form-control" type="text" name="name"
                defaultValue={asValue(tenant.name)} required />
            </div>
            <div className="col-md-6">
              <label className="form-label">Display name</label>
              <input className="form-control" type="text" name="display_name"
                defaultValue={asValue(tenant.display_name)}
                placeholder="Trading name if different from business name" />
            </div>
            <div className="col-md-6">
              <label className="form-label">Contact email</label>
              <input className="form-control" type="email" name="contact_email"
                defaultValue={asValue(tenant.contact_email)} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Timezone</label>
              <input className="form-control" type="text" name="timezone"
                defaultValue={asValue(tenant.timezone, 'Europe/London')}
                placeholder="e.g. Europe/London" />
            </div>
            <div className="col-md-6">
              <label className="form-label">Logo URL</label>
              <input className="form-control" type="url" name="logo_url"
                defaultValue={asValue(tenant.logo_url)}
                placeholder="https://example.com/logo.png" />
            </div>
            <div className="col-md-6">
              <label className="form-label">Brand colour</label>
              <input className="form-control" type="text" name="brand_colour"
                defaultValue={asValue(tenant.brand_colour)}
                placeholder="#3b82f6" />
            </div>
            <div className="col-12">
              <button className="btn btn-primary" type="submit">Save profile</button>
            </div>
          </div>
        </form>
      </DataCard>

      {/* Booking settings */}
      <DataCard title="Booking settings">
        <form action="/settings-actions/update-booking" method="post">
          <div className="row g-3">
            <div className="col-12">
              <label className="form-check">
                <input className="form-check-input" type="checkbox"
                  name="public_booking_enabled"
                  defaultChecked={tenant.public_booking_enabled} />
                <span className="form-check-label">
                  Public booking enabled
                  <span className="form-hint d-block">
                    When disabled, your public booking page will show as unavailable.
                  </span>
                </span>
              </label>
            </div>
            <div className="col-12">
              <label className="form-label">Booking confirmation message</label>
              <textarea className="form-control" name="booking_confirmation_message"
                rows="4"
                defaultValue={asValue(tenant.booking_confirmation_message)}
                placeholder="Thank you for your booking request. We will be in touch to confirm shortly." />
              <div className="form-hint">
                Shown to the public after they submit a booking request.
              </div>
            </div>
            <div className="col-12">
              <button className="btn btn-primary" type="submit">Save booking settings</button>
            </div>
          </div>
        </form>
      </DataCard>

      {/* Plan & usage — read only */}
      {entitlement && (
        <DataCard title="Plan & usage">
          <div className="row g-3 mb-3">
            <div className="col-md-3">
              <div className="subheader">Current plan</div>
              <div className="fw-bold">{entitlement.planName || '—'}</div>
            </div>
            <div className="col-md-3">
              <div className="subheader">Status</div>
              <span className={`badge ${
                entitlement.state === 'active'       ? 'bg-success' :
                entitlement.state === 'trial_active' ? 'bg-info'    :
                entitlement.state === 'trial_grace'  ? 'bg-warning' : 'bg-secondary'
              }`}>
                {entitlement.state === 'trial_active' ? 'Trial'
                  : entitlement.state === 'trial_grace' ? 'Trial (grace period)'
                  : entitlement.state}
              </span>
            </div>
            <div className="col-md-3">
              <div className="subheader">
                {entitlement.subscriptionStatus === 'trial' ? 'Trial ends' : 'Renews'}
              </div>
              <div>
                {entitlement.periodEnd
                  ? new Date(entitlement.periodEnd).toLocaleDateString('en-GB')
                  : '—'}
              </div>
            </div>
            {entitlement.graceDaysRemaining && (
              <div className="col-md-3">
                <div className="subheader">Grace period</div>
                <div className="text-warning fw-bold">
                  {entitlement.graceDaysRemaining} days remaining
                </div>
              </div>
            )}
          </div>

          {entitlement.usage && (
            <>
              <div className="subheader mb-2">Usage this period</div>
              <div className="row g-3">
                {Object.entries(entitlement.usage).map(([key, stat]) => (
                  <div className="col-md-3" key={key}>
                    <div className="text-secondary small mb-1">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </div>
                    <div>
                      {stat.current}
                      {stat.limit != null ? (
                        <span className="text-secondary"> / {stat.limit}</span>
                      ) : (
                        <span className="text-secondary"> / ∞</span>
                      )}
                    </div>
                    {stat.limit != null && (
                      <div className="progress mt-1" style={{ height: '4px' }}>
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
            </>
          )}

          <div className="mt-3">
            <a href="mailto:hello@availio.co" className="btn btn-outline-primary btn-sm">
              Upgrade plan
            </a>
          </div>
        </DataCard>
      )}

      {/* Account info — read only */}
      <DataCard title="Account">
        <div className="row g-3">
          <div className="col-md-4">
            <div className="subheader">Subdomain</div>
            <div>{tenant.subdomain}.availio.co</div>
          </div>
          <div className="col-md-4">
            <div className="subheader">Account status</div>
            <span className={`badge ${tenant.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
              {tenant.status}
            </span>
          </div>
          <div className="col-md-4">
            <div className="subheader">Member since</div>
            <div>{new Date(tenant.created_at).toLocaleDateString('en-GB')}</div>
          </div>
        </div>
      </DataCard>

    </LayoutShell>
  );
}
