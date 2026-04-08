import { Router } from 'express';
import { withTransaction } from '../lib/db.js';
import { AppError } from '../lib/errors.js';
import { generateAvailability } from '../services/slot-generator.js';

const router = Router();

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

router.get('/', async (req, res, next) => {
  try {
    if (!req.tenant) throw new AppError(400, 'Unable to resolve tenant from subdomain/header.');

    const resourceId = String(req.query.resource_id || '').trim();
    const fromRaw    = String(req.query.from || '').trim();
    const toRaw      = String(req.query.to || '').trim();

    if (!resourceId) return badRequest(res, 'resource_id is required');
    if (!fromRaw)    return badRequest(res, 'from is required');
    if (!toRaw)      return badRequest(res, 'to is required');

    // Accept either a date ("YYYY-MM-DD") or a full ISO datetime
    const fromDate = fromRaw.slice(0, 10);
    const toDate   = toRaw.slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) return badRequest(res, 'from must be a valid date (YYYY-MM-DD)');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(toDate))   return badRequest(res, 'to must be a valid date (YYYY-MM-DD)');
    if (toDate < fromDate) return badRequest(res, 'to must be on or after from');

    const payload = await withTransaction(async (client) => {
      await client.query('SELECT app.set_current_tenant($1)', [req.tenant.id]);

      // 1. Load resource
      const resourceResult = await client.query(
        `SELECT id, tenant_id, name, description, capacity, booking_mode,
                timezone, is_active, created_at, updated_at
           FROM public.resources
          WHERE tenant_id = $1
            AND id = $2`,
        [req.tenant.id, resourceId]
      );
      if (!resourceResult.rows[0]) throw new AppError(404, 'Resource not found');
      const resource = resourceResult.rows[0];

      const timezone = resource.timezone || 'UTC';

      // 2. Load availability rules for this resource
      const rulesResult = await client.query(
        `SELECT *
           FROM public.availability_rules
          WHERE resource_id = $1
            AND is_open = true
          ORDER BY day_of_week ASC, start_time ASC`,
        [resourceId]
      );

      // 3. Load exceptions in range
      const exceptionsResult = await client.query(
        `SELECT *
           FROM public.availability_exceptions
          WHERE resource_id = $1
            AND exception_date >= $2::date
            AND exception_date <= $3::date
          ORDER BY exception_date ASC, start_time ASC`,
        [resourceId, fromDate, toDate]
      );

      // 4. Load unavailability blocks overlapping the range
      const blocksResult = await client.query(
        `SELECT id, start_at, end_at, reason
           FROM public.unavailability_blocks
          WHERE resource_id = $1
            AND start_at < ($3::date + interval '1 day')
            AND end_at   > $2::date
          ORDER BY start_at ASC`,
        [resourceId, fromDate, toDate]
      );

      // 5. Load bookings overlapping the range
      const bookingsResult = await client.query(
        `SELECT id, start_at, end_at, status, quantity
           FROM public.bookings
          WHERE resource_id = $1
            AND status IN ('provisional', 'confirmed')
            AND start_at < ($3::date + interval '1 day')
            AND end_at   > $2::date
          ORDER BY start_at ASC`,
        [resourceId, fromDate, toDate]
      );

      // 6. Run slot generator
      const { slots, per_day } = generateAvailability({
        resourceId,
        capacity:   Number(resource.capacity || 1),
        timezone,
        fromDate,
        toDate,
        rules:      rulesResult.rows,
        exceptions: exceptionsResult.rows,
        blocks:     blocksResult.rows,
        bookings:   bookingsResult.rows,
      });

      return {
        resource,
        query: { resource_id: resourceId, from: fromDate, to: toDate },
        summary: {
          total_slots:                    slots.length,
          available_slots:                slots.filter((s) => s.is_available).length,
          blocked_slots:                  slots.filter((s) => s.blocked).length,
          fully_booked_slots:             slots.filter((s) => !s.is_available && !s.blocked).length,
          overlapping_unavailability_blocks: blocksResult.rows.length,
          availability_exceptions:        exceptionsResult.rows.length,
          has_rules:                      rulesResult.rows.length > 0,
        },
        per_day,
        slots,
        unavailability_blocks: blocksResult.rows,
        availability_exceptions: exceptionsResult.rows,
      };
    });

    return res.json(payload);
  } catch (error) {
    return next(error);
  }
});

export default router;
