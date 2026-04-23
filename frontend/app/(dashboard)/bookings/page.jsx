import Link from 'next/link';
import LayoutShell from '../../../components/LayoutShell';
import { formatDateTime } from '../../../lib/format';
import { requireAuth, apiFetch } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

function formatDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function badgeClass(status) {
  if (status === 'confirmed') return 'bg-green-lt';
  if (status === 'cancelled') return 'bg-red-lt';
  return 'bg-yellow-lt';
}

export default async function BookingsPage({ searchParams }) {
  await requireAuth();

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams || {})) {
    if (key === 'booking_id') continue;
    if (typeof value === 'string' && value.trim()) {
      query.set(key, value.trim());
    }
  }

  const [bookingsRes, resourcesRes] = await Promise.all([
    apiFetch(`/api/bookings${query.toString() ? `?${query.toString()}` : ''}`),
    apiFetch('/api/resources'),
  ]);

  const bookingsData = bookingsRes.ok ? await bookingsRes.json().catch(() => ({})) : {};
  const bookings = Array.isArray(bookingsData.data) ? bookingsData.data : [];
  const pagination = bookingsData.pagination || null;
  const error = bookingsRes.ok ? '' : (bookingsData?.error || 'Unable to load bookings.');
  const resources = resourcesRes.ok ? await resourcesRes.json().catch(() => []) : [];

  const selectedBookingId = searchParams?.booking_id || '';
  const selectedBooking = bookings.find((b) => b.id === selectedBookingId) || null;
  const isEditMode = searchParams?.edit === '1' && !!selectedBooking;
  const success = searchParams?.success || '';
  const detailReturnParams = new URLSearchParams(
    Object.fromEntries(Object.entries(searchParams || {}).filter(([k]) => k !== 'booking_id' && k !== 'edit'))
  ).toString();

  const hasActiveFilters = !!(searchParams?.status || searchParams?.resource_id || searchParams?.date_from || searchParams?.date_to);
  const showFilter = searchParams?.filter === '1' || hasActiveFilters;
  const filterToggleParams = new URLSearchParams(Object.fromEntries(Object.entries(searchParams || {}).filter(([k]) => k !== 'filter')));
  const filterToggleHref = showFilter ? `/bookings?${filterToggleParams}` : `/bookings?${filterToggleParams}&filter=1`;

  const filterButton = (
    <Link href={filterToggleHref} className={`btn btn-sm ${hasActiveFilters ? 'btn-secondary' : 'btn-outline-secondary'}`}>
      Filters{hasActiveFilters ? ' ·' : ''}
    </Link>
  );

  return (
    <LayoutShell title="Bookings" headerAction={filterButton}>
      {success ? <div className="alert alert-success">{success}</div> : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}
      {searchParams?.error ? <div className="alert alert-danger">{searchParams.error}</div> : null}

      {showFilter && (
      <div className="card mb-4">
        <div className="card-body">
          <form className="row g-3" method="get">
            <input type="hidden" name="filter" value="1" />
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
              <button className="btn btn-primary w-100" type="submit">Apply</button>
              <Link className="btn btn-outline-secondary" href="/bookings">Reset</Link>
            </div>
          </form>
        </div>
      </div>
      )}

      <div className="row g-4">
        <div className={selectedBooking ? 'col-lg-7' : 'col-12'}>
          <div className="card">
            <div className="card-header" style={{ backgroundColor: '#1e2a78', color: '#ffffff' }}>
              <h3 className="card-title" style={{ color: '#ffffff' }}>Booking list</h3>
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
                        <td className="text-end">
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

        {selectedBooking && (
        <div className="col-lg-5 panel-slide-in">
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between" style={{ backgroundColor: '#1e2a78', color: '#ffffff' }}>
              <h3 className="card-title" style={{ color: '#ffffff' }}>{isEditMode ? 'Edit booking' : 'Booking details'}</h3>
              <div className="d-flex align-items-center gap-2">
                {!isEditMode ? (
                  <Link
                    href={`/bookings?${new URLSearchParams({ ...(searchParams || {}), edit: '1' }).toString()}`}
                    className="btn btn-sm btn-outline-light"
                  >
                    Edit
                  </Link>
                ) : (
                  <Link
                    href={`/bookings?${new URLSearchParams(Object.fromEntries(Object.entries(searchParams || {}).filter(([k]) => k !== 'edit'))).toString()}`}
                    className="btn btn-sm btn-outline-light"
                  >
                    View
                  </Link>
                )}
                <Link
                  href={`/bookings?${new URLSearchParams(Object.fromEntries(Object.entries(searchParams || {}).filter(([k]) => k !== 'booking_id' && k !== 'edit'))).toString()}`}
                  className="btn btn-sm btn-outline-light"
                  aria-label="Close"
               >
               Close
               </Link> 
              </div>
            </div>
            <div className="card-body">
              {isEditMode ? (
                <form action="/booking-actions/update" method="post">
                  <input type="hidden" name="booking_id" value={selectedBooking.id} />
                  {detailReturnParams && <input type="hidden" name="return_params" value={detailReturnParams} />}
                  <div className="mb-3">
                    <label className="form-label">Customer name</label>
                    <input className="form-control" type="text" name="customer_name" defaultValue={selectedBooking.customer_name || ''} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input className="form-control" type="email" name="customer_email" defaultValue={selectedBooking.customer_email || ''} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Phone</label>
                    <input className="form-control" type="tel" name="customer_phone" defaultValue={selectedBooking.customer_phone || ''} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Party size</label>
                    <input className="form-control" type="number" name="party_size" min="1" defaultValue={selectedBooking.party_size || 1} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Start</label>
                    <input className="form-control" type="datetime-local" name="start_at" defaultValue={formatDateTimeLocal(selectedBooking.start_at)} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">End</label>
                    <input className="form-control" type="datetime-local" name="end_at" defaultValue={formatDateTimeLocal(selectedBooking.end_at)} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Notes</label>
                    <textarea className="form-control" name="notes" rows="3" defaultValue={selectedBooking.notes || ''} />
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-primary" type="submit">Save changes</button>
                    <Link
                      href={`/bookings?${new URLSearchParams(Object.fromEntries(Object.entries(searchParams || {}).filter(([k]) => k !== 'edit'))).toString()}`}
                      className="btn btn-outline-secondary"
                    >
                      Cancel
                    </Link>
                  </div>
                </form>
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
        )}
      </div>
    </LayoutShell>
  );
}
