import { Router } from 'express';
import { asyncHandler } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { withTenantContext } from '../lib/db.js';

const router = Router();

// GET /api/analytics/utilisation
// Query params:
//   period=week  — returns 7 days from today (default)
//   date_from    — ISO date string, overrides period
//   date_to      — ISO date string, overrides period
router.get('/utilisation', requireAuth, asyncHandler(async (req, res) => {
  const tenantId = req.auth.tenant_id;

  let dateFrom, dateTo;

  if (req.query.date_from && req.query.date_to) {
    dateFrom = req.query.date_from;
    dateTo   = req.query.date_to;
  } else {
    // Default: 7 days starting today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setDate(end.getDate() + 6);
    dateFrom = today.toISOString().slice(0, 10);
    dateTo   = end.toISOString().slice(0, 10);
  }

  const result = await withTenantContext(tenantId, async (client) => {
    // Per-day booking counts across the date range
    const daysResult = await client.query(
      `SELECT
         (b.start_at AT TIME ZONE 'Europe/London')::date AS day,
         COUNT(*)::int AS booked
       FROM public.bookings b
       WHERE b.tenant_id = $1
         AND b.status != 'cancelled'
         AND (b.start_at AT TIME ZONE 'Europe/London')::date >= $2::date
         AND (b.start_at AT TIME ZONE 'Europe/London')::date <= $3::date
       GROUP BY day
       ORDER BY day ASC`,
      [tenantId, dateFrom, dateTo]
    );

    // Resources with capacity for utilisation calculation
    const resourcesResult = await client.query(
      `SELECT id, name, capacity
       FROM public.resources
       WHERE tenant_id = $1
         AND archived_at IS NULL`,
      [tenantId]
    );

    const resources     = resourcesResult.rows;
    const totalCapacity = 1; // unused — kept for per-resource stats below

    // Build day map — fill every day in range even if zero bookings
    const dayMap = {};
    const cursor = new Date(dateFrom + 'T00:00:00Z');
    const end    = new Date(dateTo   + 'T00:00:00Z');
    while (cursor <= end) {
      dayMap[cursor.toISOString().slice(0, 10)] = 0;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    for (const row of daysResult.rows) {
      // row.day comes back as a JS Date from pg — format it as local date string
      const d   = row.day;
      const key = typeof d === 'string'
        ? d.slice(0, 10)
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dayMap[key] = row.booked;
    }

    const bookedValues = Object.values(dayMap);
    const maxBooked    = Math.max(1, ...bookedValues);

    const days = Object.entries(dayMap).map(([date, booked]) => ({
      date,
      booked,
      pct: booked / maxBooked,
    }));

    // Per-resource bookings today
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const resourceUtilResult = await client.query(
      `SELECT
         b.resource_id,
         COUNT(*)::int AS booked_today
       FROM public.bookings b
       WHERE b.tenant_id = $1
         AND b.status != 'cancelled'
         AND (b.start_at AT TIME ZONE 'Europe/London')::date = $2::date
       GROUP BY b.resource_id`,
      [tenantId, today]
    );

    const bookedTodayMap = {};
    for (const row of resourceUtilResult.rows) {
      bookedTodayMap[row.resource_id] = row.booked_today;
    }

    const resourceStats = resources.map(r => ({
      resource_id:  r.id,
      name:         r.name,
      capacity:     r.capacity || 1,
      booked_today: bookedTodayMap[r.id] || 0,
      pct:          r.capacity > 0
        ? Math.min(1, (bookedTodayMap[r.id] || 0) / r.capacity)
        : 0,
    }));

    return { days, resources: resourceStats };
  });

  res.json(result);
}));

export default router;
