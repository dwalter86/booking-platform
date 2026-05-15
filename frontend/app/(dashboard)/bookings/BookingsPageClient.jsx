'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { formatDateTime } from '../../../lib/format';
import BookingPanel from '../../../components/booking-panel/BookingPanel';

function pillClass(status) {
  if (status === 'confirmed') return 'confirmed';
  if (status === 'cancelled') return 'cancelled';
  return 'provisional';
}

export default function BookingsPageClient() {
  const searchParams = useSearchParams();

  // Filter/pagination state stays in the URL.
  const status = searchParams.get('status') || '';
  const resourceIdFilter = searchParams.get('resource_id') || '';
  const dateFrom = searchParams.get('date_from') || '';
  const dateTo = searchParams.get('date_to') || '';
  const page = searchParams.get('page') || '';
  const success = searchParams.get('success') || '';

  // Panel state is client-only — no URL involvement.
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [mode, setMode] = useState('view');

  // Data
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [resources, setResources] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Build the query string for the bookings API from URL filter params.
  const filterQuery = (() => {
    const q = new URLSearchParams();
    if (status) q.set('status', status);
    if (resourceIdFilter) q.set('resource_id', resourceIdFilter);
    if (dateFrom) q.set('date_from', dateFrom);
    if (dateTo) q.set('date_to', dateTo);
    if (page) q.set('page', page);
    return q.toString();
  })();

  // Fetch bookings whenever filters change.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/bookings/list${filterQuery ? `?${filterQuery}` : ''}`, { cache: 'no-store' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (!r.ok) {
          setError(data?.error || 'Unable to load bookings.');
          setBookings([]);
          setPagination(null);
        } else {
          setError('');
          setBookings(Array.isArray(data.data) ? data.data : []);
          setPagination(data.pagination || null);
        }
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message || 'Unable to load bookings.');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [filterQuery]);

  // Fetch resources and event types once on mount.
  useEffect(() => {
    fetch('/api/resources/list', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setResources(Array.isArray(d) ? d : []))
      .catch(() => setResources([]));
    fetch('/api/event-types/list', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setEventTypes(Array.isArray(d) ? d : []))
      .catch(() => setEventTypes([]));
  }, []);

  const selectedBooking = bookings.find((b) => b.id === selectedBookingId) || null;

  const handleOpenBooking = useCallback((bookingId) => {
    setSelectedBookingId(bookingId);
    setMode('view');
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedBookingId('');
    setMode('view');
  }, []);

  const hasActiveFilters = !!(status || resourceIdFilter || dateFrom || dateTo);

  const confirmedCount   = bookings.filter((b) => b.status === 'confirmed').length;
  const provisionalCount = bookings.filter((b) => b.status === 'provisional').length;
  const cancelledCount   = bookings.filter((b) => b.status === 'cancelled').length;
  const totalLabel = pagination ? pagination.total_count : bookings.length;

  // Helper to build a paged URL preserving current filter params.
  const pageUrl = (n) => {
    const q = new URLSearchParams(searchParams.toString());
    q.set('page', String(n));
    return `/bookings?${q.toString()}`;
  };

  return (
    <>
      {success ? <div className="alert alert-success mb-4">{success}</div> : null}
      {error ? <div className="alert alert-danger mb-4">{error}</div> : null}

      {/* — Page header — */}
      <div className="av-page-header">
        <div className="av-ph-title">
          <h1>Bookings</h1>
          <p>Review, confirm, and cancel bookings across all resources.</p>
        </div>
      </div>

      {/* — Summary — */}
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

      {/* — Toolbar (filters) — */}
      <form className="av-toolbar" method="get">
        <select className="av-filter-chip" name="status" defaultValue={status}>
          <option value="">All statuses</option>
          <option value="provisional">Provisional</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="av-filter-chip" name="resource_id" defaultValue={resourceIdFilter}>
          <option value="">All resources</option>
          {resources.map((resource) => (
            <option key={resource.id} value={resource.id}>{resource.name}</option>
          ))}
        </select>
        <input
          className="av-filter-chip"
          type="date"
          name="date_from"
          defaultValue={dateFrom}
          aria-label="From date"
        />
        <input
          className="av-filter-chip"
          type="date"
          name="date_to"
          defaultValue={dateTo}
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
                  {loading ? 'Loading…' : 'No bookings found.'}
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
                    <button
                      type="button"
                      className={`av-tiny-btn${isSelected ? ' primary' : ''}`}
                      onClick={() => handleOpenBooking(booking.id)}
                    >
                      View
                    </button>
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
                    <Link href={pageUrl(pagination.page - 1)}>Prev</Link>
                  ) : (
                    <span className="av-pager-btn disabled">Prev</span>
                  )}
                  {pagination.page < pagination.total_pages ? (
                    <Link href={pageUrl(pagination.page + 1)}>Next</Link>
                  ) : (
                    <span className="av-pager-btn disabled">Next</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedBookingId && (
        <BookingPanel
          bookingId={selectedBookingId}
          booking={selectedBooking || undefined}
          resources={resources}
          eventTypes={eventTypes}
          mode={mode}
          onModeChange={setMode}
          onClose={handleClosePanel}
        />
      )}
    </>
  );
}
