export const dynamic = 'force-dynamic';

import { headers } from 'next/headers';
import PublicBookingCalendarClient from '../../components/PublicBookingCalendarClient';

async function getResources() {
  const host = headers().get('x-forwarded-host') || headers().get('host') || 'default.platform.local';
  const tenantSubdomain = host.split(':')[0].split('.')[0];

  try {
    const response = await fetch('http://127.0.0.1:3001/api/public-bookings/resources', {
      headers: {
        'x-tenant-subdomain': tenantSubdomain
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      return { resources: [], error: 'Unable to load resources.' };
    }

    const data = await response.json();
    return { resources: data.resources || [], error: '' };
  } catch {
    return { resources: [], error: 'Booking API unavailable.' };
  }
}

export default async function PublicBookingPage({ searchParams }) {
  const { resources, error } = await getResources();
  const success = searchParams?.success || '';
  const formError = searchParams?.error || error;

  return (
    <div className="page page-center">
      <div className="container py-4">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Book a resource</h2>
              </div>
              <div className="card-body">
                {success ? <div className="alert alert-success">{success}</div> : null}
                {formError ? <div className="alert alert-danger">{formError}</div> : null}

                <form action="/api/public-bookings/request" method="post">
                  <div className="mb-3">
                    <label className="form-label">Resource</label>
                    <select name="resource_id" className="form-select" required>
                      <option value="">Select a resource</option>
                      {resources.map((resource) => (
                        <option key={resource.id} value={resource.id}>
                          {resource.name} (capacity: {resource.capacity})
                        </option>
                      ))}
                    </select>
                  </div>

                  <PublicBookingCalendarClient resources={resources} />

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Start</label>
                      <input className="form-control" type="datetime-local" name="start_at_local" required />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">End</label>
                      <input className="form-control" type="datetime-local" name="end_at_local" required />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Your name</label>
                      <input className="form-control" type="text" name="customer_name" required />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Your email</label>
                      <input className="form-control" type="email" name="customer_email" required />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Phone</label>
                      <input className="form-control" type="text" name="customer_phone" />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Party size</label>
                      <input className="form-control" type="number" name="party_size" min="1" defaultValue="1" required />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Notes</label>
                    <textarea className="form-control" name="notes" rows="4" />
                  </div>

                  <button className="btn btn-primary" type="submit">Submit provisional booking request</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
