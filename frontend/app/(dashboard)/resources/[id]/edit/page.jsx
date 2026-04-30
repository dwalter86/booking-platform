import Link from 'next/link';
import LayoutShell from '../../../../../components/LayoutShell';
import BookingFormTypeSelector from '../../../../../components/BookingFormTypeSelector';
import { apiFetch, requireAuth } from '../../../../../lib/auth';

export const dynamic = 'force-dynamic';

function asValue(value, fallback = '') {
  return value === null || value === undefined ? fallback : String(value);
}

function checked(value) {
  return Boolean(value);
}

export default async function ResourceEditPage({ params, searchParams }) {
  await requireAuth();
  const { id } = params;

  const res = await apiFetch('/api/resources');
  if (!res.ok) {
    return (
      <LayoutShell title="Resource not found">
        <div className="alert alert-danger">Could not load resources. Please try again.</div>
        <Link href="/resources" className="btn btn-outline-secondary btn-sm">← Back to Resources</Link>
      </LayoutShell>
    );
  }

  const rows = await res.json();
  const resource = Array.isArray(rows) ? rows.find(r => r.id === id) || null : null;

  if (!resource) {
    return (
      <LayoutShell title="Resource not found">
        <div className="alert alert-danger">Resource not found or you do not have access.</div>
        <Link href="/resources" className="btn btn-outline-secondary btn-sm">← Back to Resources</Link>
      </LayoutShell>
    );
  }
  const success = searchParams?.success || '';
  const error = searchParams?.error || '';

  const backButton = (
    <Link href="/resources" className="btn btn-sm btn-outline-secondary">
      ← Resources
    </Link>
  );

  return (
    <LayoutShell title={resource.name} headerAction={backButton}>
      {success && <div className="alert alert-success mb-4">{success}</div>}
      {error   && <div className="alert alert-danger mb-4">{error}</div>}

      {/* ── Resource details ── */}
      <div className="card mb-4">
        <div className="card-header" style={{ backgroundColor: '#1e2a78', color: '#fff' }}>
          <h3 className="card-title mb-0" style={{ color: '#fff' }}>Resource details</h3>
        </div>
        <div className="card-body">
          <form action="/resource-actions/update" method="post">
            <input type="hidden" name="id" value={resource.id} />
            <input type="hidden" name="return_to" value={`/resources/${id}/edit`} />
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Name</label>
                <input className="form-control" type="text" name="name" defaultValue={asValue(resource.name)} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Slug</label>
                <input className="form-control" type="text" name="slug" defaultValue={asValue(resource.slug)} required />
                <div className="form-text">Used in the public booking URL: /book/{asValue(resource.slug)}</div>
              </div>
              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea className="form-control" name="description" rows="3" defaultValue={asValue(resource.description)} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Capacity</label>
                <input className="form-control" type="number" min="1" name="capacity" defaultValue={asValue(resource.capacity, '1')} required />
              </div>
              <div className="col-md-4">
                <label className="form-label">Booking mode</label>
                <select className="form-select" name="booking_mode" defaultValue={asValue(resource.booking_mode, 'free')}>
                  <option value="free">Free</option>
                  <option value="availability_only">Availability only</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Timezone</label>
                <input className="form-control" type="text" name="timezone" defaultValue={asValue(resource.timezone, 'Europe/London')} placeholder="e.g. Europe/London" />
              </div>
              <div className="col-md-4">
                <label className="form-label">Max booking hours</label>
                <input className="form-control" type="number" step="0.5" min="0" name="max_booking_duration_hours" defaultValue={asValue(resource.max_booking_duration_hours)} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Min notice hours</label>
                <input className="form-control" type="number" min="0" name="min_notice_hours" defaultValue={asValue(resource.min_notice_hours, '0')} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Max advance days</label>
                <input className="form-control" type="number" min="0" name="max_advance_booking_days" defaultValue={asValue(resource.max_advance_booking_days)} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Buffer before (mins)</label>
                <input className="form-control" type="number" min="0" name="buffer_before_minutes" defaultValue={asValue(resource.buffer_before_minutes, '0')} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Buffer after (mins)</label>
                <input className="form-control" type="number" min="0" name="buffer_after_minutes" defaultValue={asValue(resource.buffer_after_minutes, '0')} />
              </div>
              <div className="col-12">
                <label className="form-check">
                  <input className="form-check-input" type="checkbox" name="is_active" defaultChecked={checked(resource.is_active)} />
                  <span className="form-check-label">Resource is active</span>
                </label>
              </div>
              <div className="col-12 d-flex justify-content-between align-items-center">
                <button className="btn btn-primary" type="submit">Save changes</button>
                <form action="/resource-actions/delete" method="post" style={{ display: 'inline' }}>
                  <input type="hidden" name="id" value={resource.id} />
                  <button className="btn btn-outline-danger" type="submit">
                    Delete resource
                  </button>
                </form>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ── Booking form ── */}
      <div className="card">
        <div className="card-header" style={{ backgroundColor: '#1e2a78', color: '#fff' }}>
          <h3 className="card-title mb-0" style={{ color: '#fff' }}>Booking form</h3>
          <p className="card-subtitle mt-1" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
            Choose the layout customers see when booking this resource. Changes save automatically.
          </p>
        </div>
        <div className="card-body">
          <BookingFormTypeSelector
            resourceId={resource.id}
            resourceSlug={resource.slug}
            initialValue={asValue(resource.booking_form_type, 'classic')}
          />
        </div>
      </div>
    </LayoutShell>
  );
}
