export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import Link from 'next/link';
import { config } from '../../../lib/config';
import { headers } from 'next/headers';
import LayoutShell from '../../../components/LayoutShell';
import { formatDateTime } from '../../../lib/format';

function getTenantSubdomain() {
  const headerStore   = headers();
  const forwardedHost = headerStore.get('x-forwarded-host');
  const hostHeader    = forwardedHost || headerStore.get('host') || 'localhost';
  return hostHeader.split(':')[0].split('.')[0] || null;
}

async function getBookings(searchParams) {
  const token = cookies().get('booking_admin_token')?.value;
  if (!token) {
    return { bookings: [], error: 'Session expired. Please sign in again.' };
  }

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams || {})) {
    if (key === 'booking_id') continue;
    if (typeof value === 'string' && value.trim()) {
      query.set(key, value.trim());
    }
  }

  const url = `${config.apiBaseUrl}/api/bookings${query.toString() ? `?${query.toString()}` : ''}`;

  try {
    const subdomain = getTenantSubdomain();
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(subdomain ? { 'x-tenant-subdomain': subdomain } : {}),
      },
      cache: 'no-store'
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { bookings: [], pagination: null, error: data?.error || 'Unable to load bookings.' };
    }

    return { bookings: Array.isArray(data.data) ? data.data : [], pagination: data.pagination || null, error: '' };
  } catch {
    return { bookings: [], pagination: null, error: 'Booking API unavailable.' };
  }
}

async function getResources() {
  const token = cookies().get('booking_admin_token')?.value;
  if (!token) return [];

  try {
    const subdomain = getTenantSubdomain();
    const response = await fetch(`${config.apiBaseUrl}/api/resources`, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(subdomain ? { 'x-tenant-subdomain': subdomain } : {}),
      },
      cache: 'no-store'
    });

    if (!response.ok) return [];
    const data = await response.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function badgeClass(status) {
  if (status === 'confirmed') return 'bg-green-lt';
  if (status === 'cancelled') return 'bg-red-lt';
  return 'bg-yellow-lt';
}

export default async function BookingsPage({ searchParams }) {
  const [{ bookings, pagination, error }, resources] = await Promise.all([
    getBookings(searchParams),
    getResources()
  ]);

  const selectedBookingId = searchParams?.booking_id || '';
  const selectedBooking = bookings.find((b) => b.id === selectedBookingId) || null;
  const success = searchParams?.success || '';

  return (
    <LayoutShell title="Bookings">
      <p className="text-secondary mb-4">Review, confirm, and cancel provisional bookings.</p>

      {success ? <div className="alert alert-success">{success}</div> : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}
      {searchParams?.error ? <div className="alert alert-danger">{searchParams.error}</div> : null}

      <div className="card mb-4">
        <div className="card-body">
          <form className="row g-3" method="get">
            <div className="col-md-3">
              <label className="form-label">Status</label>
              <select className="form-select" name="status" defaultValue={searchParams?.status || ''}>
                <option value="">All statuses</option>
                <option value="provisional">Provisional</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Resource</label>
              <select className="form-select" name="resource_id" defaultValue={searchParams?.resource_id || ''}>
                <option value="">All resources</option>
                {resources.map((resource) => (
                  <option key={resource.id} value={resource.id}>{resource.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">From</label>
              <input className="form-control" type="date" name="date_from" defaultValue={searchParams?.date_from || ''} />
            </div>
            <div className="col-md-2">
              <label className="form-label">To</label>
              <input className="form-control" type="date" name="date_to" defaultValue={searchParams?.date_to || ''} />
            </div>
            <div className="col-md-2 d-flex align-items-end gap-2">
              <button className="btn btn-primary w-100" type="submit">Filter</button>
              <Link className="btn btn-outline-secondary" href="/bookings">Reset</Link>
            </div>
          </form>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Booking list</h3>
            </div>
            <div className="table-responsive">
              <table className="table table-vcenter card-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Resource</th>
                    <th>Customer</th>
                    <th>Start</th>
                    <th>End</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-secondary">No bookings found.</td>
                    </tr>
                  ) : bookings.map((booking) => {
                    const isSelected = booking.id === selectedBookingId;
                    return (
                      <tr key={booking.id} className={isSelected ? 'table-active' : undefined}>
                        <td><span className={`badge ${badgeClass(booking.status)}`}>{booking.status}</span></td>
                        <td>{booking.resource_name || 'Unknown resource'}</td>
                        <td>
                          <div>{booking.customer_name || '—'}</div>
                          <div className="text-secondary small">{booking.customer_email || '—'}</div>
                        </td>
                        <td>{formatDateTime(booking.start_at)}</td>
                        <td>{formatDateTime(booking.end_at)}</td>
                        <td>
                          <Link
                            className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline-primary'}`}
                            href={`/bookings?${new URLSearchParams({ ...(searchParams || {}), booking_id: booking.id }).toString()}`}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {pagination && pagination.total_pages > 1 && (
              <div className="card-footer d-flex align-items-center justify-content-between">
                <span className="text-secondary text-sm">
                  {pagination.total_count} bookings — page {pagination.page} of {pagination.total_pages}
                </span>
                <div className="d-flex gap-2">
                  {pagination.page > 1 && (
                    <Link
                      className="btn btn-sm btn-outline-secondary"
                      href={`/bookings?${new URLSearchParams({ ...(searchParams || {}), page: pagination.page - 1 }).toString()}`}
                    >
                      Previous
                    </Link>
                  )}
                  {pagination.page < pagination.total_pages && (
                    <Link
                      className="btn btn-sm btn-outline-secondary"
                      href={`/bookings?${new URLSearchParams({ ...(searchParams || {}), page: pagination.page + 1 }).toString()}`}
                    >
                      Next
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Booking details</h3>
            </div>
            <div className="card-body">
              {!selectedBooking ? (
                <div className="text-secondary">Select a booking to view details and actions.</div>
              ) : (
                <>
                  <dl className="row mb-0">
                    <dt className="col-sm-4">Status</dt>
                    <dd className="col-sm-8"><span className={`badge ${badgeClass(selectedBooking.status)}`}>{selectedBooking.status}</span></dd>

                    <dt className="col-sm-4">Resource</dt>
                    <dd className="col-sm-8">{selectedBooking.resource_name || 'Unknown resource'}</dd>

                    <dt className="col-sm-4">Customer</dt>
                    <dd className="col-sm-8">{selectedBooking.customer_name || '—'}</dd>

                    <dt className="col-sm-4">Email</dt>
                    <dd className="col-sm-8">{selectedBooking.customer_email || '—'}</dd>

                    <dt className="col-sm-4">Phone</dt>
                    <dd className="col-sm-8">{selectedBooking.customer_phone || '—'}</dd>

                    <dt className="col-sm-4">Party size</dt>
                    <dd className="col-sm-8">{selectedBooking.party_size || 1}</dd>

                    <dt className="col-sm-4">Start</dt>
                    <dd className="col-sm-8">{formatDateTime(selectedBooking.start_at)}</dd>

                    <dt className="col-sm-4">End</dt>
                    <dd className="col-sm-8">{formatDateTime(selectedBooking.end_at)}</dd>

                    <dt className="col-sm-4">Source</dt>
                    <dd className="col-sm-8">{selectedBooking.source || '—'}</dd>

                    <dt className="col-sm-4">Reference</dt>
                    <dd className="col-sm-8">{selectedBooking.reference_code || '—'}</dd>

                    <dt className="col-sm-4">Notes</dt>
                    <dd className="col-sm-8">{selectedBooking.notes || '—'}</dd>

                    <dt className="col-sm-4">Confirmed at</dt>
                    <dd className="col-sm-8">{formatDateTime(selectedBooking.confirmed_at)}</dd>

                    <dt className="col-sm-4">Cancelled at</dt>
                    <dd className="col-sm-8">{formatDateTime(selectedBooking.cancelled_at)}</dd>

                    <dt className="col-sm-4">Cancel reason</dt>
                    <dd className="col-sm-8">{selectedBooking.cancellation_reason || '—'}</dd>
                  </dl>

                  <hr />

                  <div className="d-flex flex-column gap-3">
                    <form action="/api/bookings/confirm" method="post">
                      <input type="hidden" name="booking_id" value={selectedBooking.id} />
                      <button
                        className="btn btn-success"
                        type="submit"
                        disabled={selectedBooking.status === 'confirmed' || selectedBooking.status === 'cancelled'}
                      >
                        Confirm booking
                      </button>
                    </form>

                    <form action="/api/bookings/cancel" method="post">
                      <input type="hidden" name="booking_id" value={selectedBooking.id} />
                      <label className="form-label">Cancellation reason</label>
                      <textarea className="form-control mb-2" name="reason" rows="3" placeholder="Optional reason for cancellation" />
                      <button
                        className="btn btn-danger"
                        type="submit"
                        disabled={selectedBooking.status === 'cancelled'}
                      >
                        Cancel booking
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
