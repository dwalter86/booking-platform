import LayoutShell from '../../../components/LayoutShell';
import DataCard from '../../../components/DataCard';
import { apiFetch, requireAuth } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

function asValue(value, fallback = '') {
  return value === null || value === undefined ? fallback : String(value);
}

export default async function SettingsPage({ searchParams }) {
  await requireAuth();

  const [tenantRes, entitlementRes] = await Promise.all([
    apiFetch('/api/tenant/profile'),
    apiFetch('/api/entitlement'),
  ]);

  const tenant      = tenantRes.ok      ? await tenantRes.json()      : null;
  const entitlement = entitlementRes.ok ? await entitlementRes.json() : null;

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
