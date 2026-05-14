import { Router } from 'express';
import { asyncHandler } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { withTenantContext } from '../lib/db.js';
import { resolveOpenWindowsForDate } from '../services/slot-generator.js';

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function localDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Calculate max possible bookings for a resource on a given date.
 *
 * Logic:
 *   1. Resolve open windows (handles exceptions and closed days)
 *   2. Find smallest effective slot duration across all event types:
 *      effective = duration_minutes + buffer_before_minutes + buffer_after_minutes
 *   3. For each window: floor(window_minutes / min_effective_duration) * capacity
 *   4. Sum across all windows = max_capacity_for_day
 *
 * Returns 0 if no rules, no event types, or day is closed.
 */
function calcMaxCapacity(dateStr, resource, rules, exceptions, eventTypes) {
  if (!rules.length || !eventTypes.length) return 0;

  const dayOfWeek = new Date(dateStr + 'T12:00:00').getDay(); // local noon avoids DST edge
  const windows   = resolveOpenWindowsForDate(
    dateStr, dayOfWeek, rules, exceptions, resource.timezone || 'Europe/London'
  );

  if (!windows.length) return 0;

  // Smallest effective duration across all event types for this resource
  const minEffective = Math.min(
    ...eventTypes.map(et =>
      (et.duration_minutes || 60) +
      (et.buffer_before_minutes || 0) +
      (et.buffer_after_minutes || 0)
    )
  );

  if (minEffective <= 0) return 0;

  let total = 0;
  for (const w of windows) {
    const windowMins = w.end.diff(w.start, 'minutes').minutes;
    const slots      = Math.floor(windowMins / minEffective);
    total           += slots * (resource.capacity || 1);
  }
  return total;
}

// ---------------------------------------------------------------------------
// GET /api/analytics/utilisation
//
// Query params:
//   date_from      — YYYY-MM-DD (required or use period)
//   date_to        — YYYY-MM-DD (required or use period)
//   resource_id    — optional, filter to a single resource
//
// Response:
//   days[]         — per-day { date, booked, max_capacity, pct }
//   resources[]    — per-resource stats for today
// ---------------------------------------------------------------------------
router.get('/utilisation', requireAuth, asyncHandler(async (req, res) => {
  const tenantId   = req.auth.tenant_id;
  const resourceId = String(req.query.resource_id || '').trim() || null;

  // Date range — default to current 7-day week starting today
  let dateFrom, dateTo;
  if (req.query.date_from && req.query.date_to) {
    dateFrom = req.query.date_from;
    dateTo   = req.query.date_to;
  } else {
    const now = new Date();
    dateFrom  = localDateStr(now);
    const end = new Date(now);
    end.setDate(end.getDate() + 6);
    dateTo = localDateStr(end);
  }

  const result = await withTenantContext(tenantId, async (client) => {

    // ── 1. Fetch resources ──────────────────────────────────────────────────
    const resourcesResult = await client.query(
      `SELECT id, name, capacity, timezone
       FROM public.resources
       WHERE tenant_id = $1
         AND archived_at IS NULL
         ${resourceId ? 'AND id = $2' : ''}
       ORDER BY name ASC`,
      resourceId ? [tenantId, resourceId] : [tenantId]
    );
    const resources = resourcesResult.rows;

    if (!resources.length) {
      return { days: buildEmptyDays(dateFrom, dateTo), resources: [] };
    }

    const resourceIds = resources.map(r => r.id);

    // ── 2. Fetch availability rules for all resources ───────────────────────
    const rulesResult = await client.query(
      `SELECT resource_id, day_of_week, start_time::text, end_time::text,
              slot_duration_minutes, slot_interval_minutes, is_open
       FROM public.availability_rules
       WHERE tenant_id = $1
         AND resource_id = ANY($2)`,
      [tenantId, resourceIds]
    );

    // ── 3. Fetch availability exceptions for date range ─────────────────────
    const exceptionsResult = await client.query(
      `SELECT resource_id, exception_date::text AS exception_date,
              start_time::text, end_time::text, is_closed
       FROM public.availability_exceptions
       WHERE tenant_id = $1
         AND resource_id = ANY($2)
         AND exception_date >= $3::date
         AND exception_date <= $4::date`,
      [tenantId, resourceIds, dateFrom, dateTo]
    );

    // ── 4. Fetch event types for all resources ──────────────────────────────
    const eventTypesResult = await client.query(
      `SELECT resource_id, duration_minutes,
              buffer_before_minutes, buffer_after_minutes
       FROM public.event_types
       WHERE tenant_id = $1
         AND resource_id = ANY($2)
         AND status = 'active'`,
      [tenantId, resourceIds]
    );

    // ── 5. Fetch actual bookings in date range ──────────────────────────────
    const bookingsResult = await client.query(
      `SELECT resource_id,
              (start_at AT TIME ZONE 'Europe/London')::date AS day,
              COUNT(*)::int AS booked
       FROM public.bookings
       WHERE tenant_id = $1
         AND status != 'cancelled'
         AND (start_at AT TIME ZONE 'Europe/London')::date >= $2::date
         AND (start_at AT TIME ZONE 'Europe/London')::date <= $3::date
         ${resourceId ? 'AND resource_id = $4' : ''}
       GROUP BY resource_id, day`,
      resourceId ? [tenantId, dateFrom, dateTo, resourceId] : [tenantId, dateFrom, dateTo]
    );

    // ── 6. Index data by resource ───────────────────────────────────────────
    const rulesByResource      = groupBy(rulesResult.rows,      'resource_id');
    const exceptionsByResource = groupBy(exceptionsResult.rows, 'resource_id');
    const eventTypesByResource = groupBy(eventTypesResult.rows, 'resource_id');

    // bookings: { 'resource_id:date': count }
    const bookingMap = {};
    for (const row of bookingsResult.rows) {
      const d   = row.day;
      const key_date = typeof d === 'string' ? d.slice(0, 10)
        : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      bookingMap[`${row.resource_id}:${key_date}`] = row.booked;
    }

    // ── 7. Build per-day aggregates ─────────────────────────────────────────
    const days = [];
    const cursor = new Date(dateFrom + 'T12:00:00');
    const endDate = new Date(dateTo + 'T12:00:00');

    while (cursor <= endDate) {
      const dateStr    = localDateStr(cursor);
      let totalBooked  = 0;
      let totalMax     = 0;

      for (const r of resources) {
        const booked = bookingMap[`${r.id}:${dateStr}`] || 0;
        const max    = calcMaxCapacity(
          dateStr,
          r,
          rulesByResource[r.id]      || [],
          exceptionsByResource[r.id] || [],
          eventTypesByResource[r.id] || []
        );
        totalBooked += booked;
        totalMax    += max;
      }

      days.push({
        date:         dateStr,
        booked:       totalBooked,
        max_capacity: totalMax,
        pct:          totalMax > 0 ? Math.min(1, totalBooked / totalMax) : 0,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    // ── 8. Per-resource stats for today ─────────────────────────────────────
    const today      = localDateStr(new Date());
    const resourceStats = resources.map(r => {
      const booked = bookingMap[`${r.id}:${today}`] || 0;
      const max    = calcMaxCapacity(
        today,
        r,
        rulesByResource[r.id]      || [],
        exceptionsByResource[r.id] || [],
        eventTypesByResource[r.id] || []
      );
      return {
        resource_id:  r.id,
        name:         r.name,
        capacity:     r.capacity || 1,
        booked_today: booked,
        max_today:    max,
        pct:          max > 0 ? Math.min(1, booked / max) : 0,
      };
    });

    return { days, resources: resourceStats };
  });

  res.json(result);
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupBy(rows, key) {
  const map = {};
  for (const row of rows) {
    const k = row[key];
    if (!map[k]) map[k] = [];
    map[k].push(row);
  }
  return map;
}

function buildEmptyDays(dateFrom, dateTo) {
  const days   = [];
  const cursor = new Date(dateFrom + 'T12:00:00');
  const end    = new Date(dateTo   + 'T12:00:00');
  while (cursor <= end) {
    days.push({ date: localDateStr(cursor), booked: 0, max_capacity: 0, pct: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export default router;
