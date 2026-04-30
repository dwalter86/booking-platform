import Link from 'next/link';
import LayoutShell from '../../../../components/LayoutShell';
import { requireAuth } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export default async function ResourceNewPage({ searchParams }) {
  await requireAuth();
  const error = searchParams?.error || '';

  const backButton = (
    <Link href="/resources" className="btn btn-sm btn-outline-secondary">
      ← Resources
    </Link>
  );

  return (
    <LayoutShell title="New resource" headerAction={backButton}>
      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <div className="card">
        <div className="card-header" style={{ backgroundColor: '#1e2a78', color: '#fff' }}>
          <h3 className="card-title mb-0" style={{ color: '#fff' }}>Resource details</h3>
          <p className="card-subtitle mt-1" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
            After creating, you can set the booking form style and configure availability.
          </p>
        </div>
        <div className="card-body">
          <form action="/resource-actions/create" method="post">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Name</label>
                <input className="form-control" type="text" name="name" required autoFocus />
              </div>
              <div className="col-md-6">
                <label className="form-label">Slug</label>
                <input className="form-control" type="text" name="slug" placeholder="meeting-room-a" />
                <div className="form-text">Used in the public booking URL. Leave blank to auto-generate from name.</div>
              </div>
              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea className="form-control" name="description" rows="3" />
              </div>
              <div className="col-md-4">
                <label className="form-label">Capacity</label>
                <input className="form-control" type="number" min="1" name="capacity" defaultValue="1" required />
              </div>
              <div className="col-md-4">
                <label className="form-label">Booking mode</label>
                <select className="form-select" name="booking_mode" defaultValue="free">
                  <option value="free">Free</option>
                  <option value="availability_only">Availability only</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Timezone</label>
                <input className="form-control" type="text" name="timezone" defaultValue="Europe/London" placeholder="e.g. Europe/London" />
              </div>
              <div className="col-md-4">
                <label className="form-label">Max booking hours</label>
                <input className="form-control" type="number" step="0.5" min="0" name="max_booking_duration_hours" />
              </div>
              <div className="col-md-4">
                <label className="form-label">Min notice hours</label>
                <input className="form-control" type="number" min="0" name="min_notice_hours" defaultValue="0" />
              </div>
              <div className="col-md-4">
                <label className="form-label">Max advance days</label>
                <input className="form-control" type="number" min="0" name="max_advance_booking_days" />
              </div>
              <div className="col-md-6">
                <label className="form-label">Buffer before (mins)</label>
                <input className="form-control" type="number" min="0" name="buffer_before_minutes" defaultValue="0" />
              </div>
              <div className="col-md-6">
                <label className="form-label">Buffer after (mins)</label>
                <input className="form-control" type="number" min="0" name="buffer_after_minutes" defaultValue="0" />
              </div>
              <div className="col-12">
                <label className="form-check">
                  <input className="form-check-input" type="checkbox" name="is_active" defaultChecked />
                  <span className="form-check-label">Resource is active</span>
                </label>
              </div>
              <div className="col-12 d-flex gap-2">
                <button className="btn btn-primary" type="submit">Create resource</button>
                <Link className="btn btn-outline-secondary" href="/resources">Cancel</Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </LayoutShell>
  );
}
