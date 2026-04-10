import SuperAdminLayoutShell from '../../../../../components/SuperAdminLayoutShell';
import DataCard from '../../../../../components/DataCard';
import { requireSuperAdmin } from '../../../../../lib/superadmin-auth';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function NewTenantPage({ searchParams }) {
  await requireSuperAdmin();

  const error = searchParams?.error || '';

  return (
    <SuperAdminLayoutShell title="Create Tenant">
      <div className="mb-3">
        <Link href="/superadmin/tenants" className="btn btn-outline-secondary btn-sm">
          ← Back to tenants
        </Link>
      </div>

      {error ? <div className="alert alert-danger mb-4">{error}</div> : null}

      <DataCard title="New tenant">
        <form action="/superadmin-actions/tenants/create" method="post">
          <h3 className="mb-3">Tenant details</h3>
          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <label className="form-label">Business name <span className="text-danger">*</span></label>
              <input className="form-control" type="text" name="name" required />
            </div>
            <div className="col-md-6">
              <label className="form-label">Display name</label>
              <input className="form-control" type="text" name="display_name" placeholder="Trading name if different" />
            </div>
            <div className="col-md-4">
              <label className="form-label">Subdomain <span className="text-danger">*</span></label>
              <div className="input-group">
                <input
                  className="form-control"
                  type="text"
                  name="subdomain"
                  placeholder="gymname"
                  pattern="[a-z0-9][a-z0-9\-]{0,28}[a-z0-9]"
                  required
                />
                <span className="input-group-text">.availio.co</span>
              </div>
              <div className="form-hint">Lowercase letters, numbers and hyphens only</div>
            </div>
            <div className="col-md-4">
              <label className="form-label">Contact email</label>
              <input className="form-control" type="email" name="contact_email" />
            </div>
            <div className="col-md-4">
              <label className="form-label">Timezone</label>
              <input className="form-control" type="text" name="timezone" defaultValue="Europe/London" />
            </div>
          </div>

          <h3 className="mb-3">Subscription</h3>
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <label className="form-label">Plan</label>
              <select className="form-select" name="plan_code" defaultValue="trial">
                <option value="trial">Trial (Pro-equivalent)</option>
                <option value="basic">Basic</option>
                <option value="growth">Growth</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Trial length (days)</label>
              <input className="form-control" type="number" name="trial_days" defaultValue="14" min="1" max="90" />
              <div className="form-hint">Only applies if plan is Trial</div>
            </div>
          </div>

          <h3 className="mb-3">First admin user</h3>
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <label className="form-label">Full name <span className="text-danger">*</span></label>
              <input className="form-control" type="text" name="admin_full_name" required />
            </div>
            <div className="col-md-4">
              <label className="form-label">Email address <span className="text-danger">*</span></label>
              <input className="form-control" type="email" name="admin_email" required />
            </div>
            <div className="col-md-4">
              <label className="form-label">Password <span className="text-danger">*</span></label>
              <input className="form-control" type="text" name="admin_password" minLength="8" required />
              <div className="form-hint">Minimum 8 characters. Share this with the tenant.</div>
            </div>
          </div>

          <button className="btn btn-primary" type="submit">Create tenant</button>
        </form>
      </DataCard>
    </SuperAdminLayoutShell>
  );
}
