import Link from 'next/link';
import LayoutShell from '../../../components/LayoutShell';
import { formatDateTime } from '../../../lib/format';
import { requireAuth, apiFetch } from '../../../lib/auth';
import BookingPanel from '../../../components/booking-panel/BookingPanel';

export const dynamic = 'force-dynamic';

function formatDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function pillClass(status) {
  if (status === 'confirmed') return 'confirmed';
  if (status === 'cancelled') return 'cancelled';
  return 'provisional';
}

function meetingPill(type) {
  if (type === 'in_person') return <span className="av-pill meet-in-person">In person</span>;
  if (type === 'online') return <span className="av-pill meet-online">Online</span>;
  if (type === 'telephone') return <span className="av-pill meet-telephone">Telephone</span>;
  return null;
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

  const [bookingsRes, resourcesRes, eventTypesRes] = await Promise.all([
    apiFetch(`/api/bookings${query.toString() ? `?${query.toString()}` : ''}`),
    apiFetch('/api/resources'),
    apiFetch('/api/event-types'),
  ]);

  const bookingsData = bookingsRes.ok ? await bookingsRes.json().catch(() => ({})) : {};
  const bookings = Array.isArray(bookingsData.data) ? bookingsData.data : [];
  const pagination = bookingsData.pagination || null;
  const error = bookingsRes.ok ? '' : (bookingsData?.error || 'Unable to load bookings.');
  const resources = resourcesRes.ok ? await resourcesRes.json().catch(() => []) : [];
  const eventTypes = eventTypesRes.ok ? await eventTypesRes.json().catch(() => []) : [];

  const selectedBookingId = searchParams?.booking_id || '';
  const selectedBooking = bookings.find((b) => b.id === selectedBookingId) || null;
  const isEditMode = searchParams?.edit === '1' && !!selectedBooking;
  const success = searchParams?.success || '';
  const detailReturnParams = new URLSearchParams(
    Object.fromEntries(Object.entries(searchParams || {}).filter(([k]) => k !== 'booking_id' && k !== 'edit'))
  ).toString();

  const hasActiveFilters = !!(searchParams?.status || searchParams?.resource_id || searchParams?.date_from || searchParams?.date_to);

  // Summary — counts of the current result page
  const confirmedCount   = bookings.filter((b) => b.status === 'confirmed').length;
  const provisionalCount = bookings.filter((b) => b.status === 'provisional').length;
  const cancelledCount   = bookings.filter((b) => b.status === 'cancelled').length;
  const totalLabel = pagination ? pagination.total_count : bookings.length;

  const breadcrumb = (
    <>
      <span>Workspace</span>
      <span className="av-crumb-sep">/</span>
      <span className="av-crumb-now">Bookings</span>
    </>
  );

 return (
    <>
    <LayoutShell breadcrumb={breadcrumb}>
      {success ? <div className="alert alert-success mb-4">{success}</div> : null}
      {error ? <div className="alert alert-danger mb-4">{error}</div> : null}
      {searchParams?.error ? <div className="alert alert-danger mb-4">{searchParams.error}</div> : null}

      {/* ── Page header ── */}
      <div className="av-page-header">
        <div className="av-ph-title">
          <h1>Bookings</h1>
          <p>Review, confirm, and cancel bookings across all resources.</p>
        </div>
      </div>

      {/* ── Summary ── */}
      <div className="av-summary">
        <div className="av-summary-card">
          <div>
            <div className="av-sc-label">Total bookings</div>
            <div className="av-sc-value">{totalLabel}</div>
            {pagination && <div className="av-sc-sub">across all pages</div>}
          </div>
        </div>
        <div className="av-summary-card">
          <div>
            <div className="av-sc-label">Confirmed</div>
            <div className="av-sc-value">{confirmedCount}</div>
            <div className="av-sc-sub">this page</div>
          </div>
        </div>
        <div className="av-summary-card">
          <div>
            <div className="av-sc-label">Provisional</div>
            <div className="av-sc-value">{provisionalCount}</div>
            <div className="av-sc-sub">awaiting action</div>
          </div>
        </div>
        <div className="av-summary-card">
          <div>
            <div className="av-sc-label">Cancelled</div>
            <div className="av-sc-value">{cancelledCount}</div>
            <div className="av-sc-sub">this page</div>
          </div>
        </div>
      </div>

      {/* ── Toolbar (filters) ── */}
      <form className="av-toolbar" method="get">
        <select className="av-filter-chip" name="status" defaultValue={searchParams?.status || ''}>
          <option value="">All statuses</option>
          <option value="provisional">Provisional</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="av-filter-chip" name="resource_id" defaultValue={searchParams?.resource_id || ''}>
          <option value="">All resources</option>
          {resources.map((resource) => (
            <option key={resource.id} value={resource.id}>{resource.name}</option>
          ))}
        </select>
        <input
          className="av-filter-chip"
          type="date"
          name="date_from"
          defaultValue={searchParams?.date_from || ''}
          aria-label="From date"
        />
        <input
          className="av-filter-chip"
          type="date"
          name="date_to"
          defaultValue={searchParams?.date_to || ''}
          aria-label="To date"
        />
        <div className="av-tb-spacer" />
        <button className="btn btn-primary btn-sm" type="submit">Apply</button>
        {hasActiveFilters && (
          <Link className="av-tiny-btn" href="/bookings">Reset</Link>
        )}
      </form>

      <div className="row g-4">
        <div className="col-12">
          <div className="av-list">
            <div className="av-list-row av-list-head cols-bookings">
              <div>Customer</div>
              <div>Resource</div>
              <div>Start</div>
              <div>End</div>
              <div>Status</div>
              <div></div>
            </div>

            {bookings.length === 0 ? (
              <div className="av-list-row cols-bookings">
                <div className="av-muted" style={{ gridColumn: '1 / -1' }}>
                  No bookings found.
                </div>
              </div>
            ) : bookings.map((booking) => {
              const isSelected = booking.id === selectedBookingId;
              return (
                <div
                  key={booking.id}
                  className={`av-list-row cols-bookings${isSelected ? ' selected' : ''}`}
                >
                  <div className="av-cell-name">
                    <div className="av-name">{booking.customer_name || '—'}</div>
                    <div className="av-slug">{booking.customer_email || '—'}</div>
                  </div>
                  <div className="av-muted">{booking.resource_name || 'Unknown resource'}</div>
                  <div className="av-muted">{formatDateTime(booking.start_at)}</div>
                  <div className="av-muted">{formatDateTime(booking.end_at)}</div>
                  <div>
                    <span className={`av-pill ${pillClass(booking.status)}`}>
                      <span className="av-dot" />
                      {booking.status}
                    </span>
                  </div>
                  <div className="av-row-actions">
                    <Link
                      className={`av-tiny-btn${isSelected ? ' primary' : ''}`}
                      href={`/bookings?${new URLSearchParams({ ...(searchParams || {}), booking_id: booking.id }).toString()}`}
                    >
                      View
                    </Link>
                  </div>
                </div>
              );
            })}

            {pagination && pagination.total_pages > 1 && (
              <div className="av-list-foot">
                <span>
                  {pagination.total_count} bookings — page {pagination.page} of {pagination.total_pages}
                </span>
                <div className="av-pager">
                  {pagination.page > 1 ? (
                    <Link href={`/bookings?${new URLSearchParams({ ...(searchParams || {}), page: pagination.page - 1 }).toString()}`}>
                      Prev
                    </Link>
                  ) : (
                    <span className="av-pager-btn disabled">Prev</span>
                  )}
                  {pagination.page < pagination.total_pages ? (
                    <Link href={`/bookings?${new URLSearchParams({ ...(searchParams || {}), page: pagination.page + 1 }).toString()}`}>
                      Next
                    </Link>
                  ) : (
                    <span className="av-pager-btn disabled">Next</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        </div>
    </LayoutShell>

    {selectedBooking && (
        <BookingPanel
          booking={selectedBooking}
          resources={resources}
          eventTypes={eventTypes}
          mode={isEditMode ? 'edit' : 'view'}
          returnParams={detailReturnParams}
          closeHref={`/bookings?${new URLSearchParams(Object.fromEntries(Object.entries(searchParams || {}).filter(([k]) => k !== 'booking_id' && k !== 'edit'))).toString()}`}
          editHref={`/bookings?${new URLSearchParams({ ...(searchParams || {}), edit: '1' }).toString()}`}
          viewHref={`/bookings?${new URLSearchParams(Object.fromEntries(Object.entries(searchParams || {}).filter(([k]) => k !== 'edit'))).toString()}`}
        />
      )}
    </>
  );
}
