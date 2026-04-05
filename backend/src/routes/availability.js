import { Router } from 'express';
import { withTransaction } from '../lib/db.js';
import { resolveTenant } from '../middleware/tenant.js';
import { AppError } from '../lib/errors.js';

const router = Router();

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

router.get('/', resolveTenant, async (req, res, next) => {
  try {
    if (!req.tenant) throw new AppError(400, 'Unable to resolve tenant from subdomain/header.');

    const resourceId = String(req.query.resource_id || '').trim();
    const fromRaw = String(req.query.from || '').trim();
    const toRaw = String(req.query.to || '').trim();

    if (!resourceId) return badRequest(res, 'resource_id is required');
    if (!fromRaw) return badRequest(res, 'from is required');
    if (!toRaw) return badRequest(res, 'to is required');

    const from = new Date(fromRaw);
    const to = new Date(toRaw);

    if (Number.isNaN(from.getTime())) return badRequest(res, 'from must be a valid ISO datetime');
    if (Number.isNaN(to.getTime())) return badRequest(res, 'to must be a valid ISO datetime');
    if (to <= from) return badRequest(res, 'to must be after from');

    const payload = await withTransaction(async (client) => {
      await client.query('SELECT app.set_current_tenant($1)', [req.tenant.id]);

      const resourceResult = await client.query(
        `SELECT id, tenant_id, name, description, capacity, booking_mode, max_booking_hours, is_active, created_at, updated_at
         FROM resources
         WHERE tenant_id = $1
           AND id = $2`,
        [req.tenant.id, resourceId]
      );

      if (!resourceResult.rows[0]) {
        throw new AppError(404, 'Resource not found');
      }

      const resource = resourceResult.rows[0];

      const bookingsResult = await client.query(
        `SELECT id, tenant_id, resource_id, customer_name, customer_email, start_at, end_at, status, notes, created_at, updated_at, party_size
         FROM bookings
         WHERE tenant_id = $1
           AND resource_id = $2
           AND start_at < $4
           AND end_at > $3
         ORDER BY start_at ASC`,
        [req.tenant.id, resourceId, from.toISOString(), to.toISOString()]
      );

      const blocksResult = await client.query(
        `SELECT id, tenant_id, resource_id, start_at, end_at, reason, created_by_user_id, created_at, updated_at
         FROM unavailability_blocks
         WHERE tenant_id = $1
           AND resource_id = $2
           AND start_at < $4
           AND end_at > $3
         ORDER BY start_at ASC`,
        [req.tenant.id, resourceId, from.toISOString(), to.toISOString()]
      );

      let exceptions = [];
      try {
        const exceptionsResult = await client.query(
          `SELECT *
           FROM availability_exceptions
           WHERE tenant_id = $1
             AND resource_id = $2
             AND starts_at < $4
             AND ends_at > $3
           ORDER BY starts_at ASC`,
          [req.tenant.id, resourceId, from.toISOString(), to.toISOString()]
        );
        exceptions = exceptionsResult.rows;
      } catch {
        exceptions = [];
      }

      const slots = [];
      const cursor = new Date(from);
      while (cursor < to) {
        const slotStart = new Date(cursor);
        const slotEnd = new Date(cursor.getTime() + 60 * 60 * 1000);
        if (slotEnd > to) break;

        const overlapsBlock = blocksResult.rows.some((row) => {
          return new Date(row.start_at) < slotEnd && new Date(row.end_at) > slotStart;
        });

        const overlappingBookings = bookingsResult.rows.filter((row) => {
          return new Date(row.start_at) < slotEnd && new Date(row.end_at) > slotStart && row.status !== 'cancelled';
        });

        const bookedCount = overlappingBookings.reduce((sum, row) => sum + Number(row.party_size || 1), 0);
        const availableCapacity = Math.max(0, Number(resource.capacity || 1) - bookedCount);

        slots.push({
          start_at: slotStart.toISOString(),
          end_at: slotEnd.toISOString(),
          blocked: overlapsBlock,
          booked_count: bookedCount,
          available_capacity: availableCapacity,
          remaining_capacity: availableCapacity,
          is_available: !overlapsBlock && availableCapacity > 0
        });

        cursor.setUTCHours(cursor.getUTCHours() + 1);
      }

      const perDayMap = new Map();
      for (const slot of slots) {
        const day = slot.start_at.slice(0, 10);
        const existing = perDayMap.get(day) || {
          date: day,
          total_slots: 0,
          available_slots: 0,
          blocked_slots: 0,
          fully_booked_slots: 0
        };
        existing.total_slots += 1;
        if (slot.blocked) existing.blocked_slots += 1;
        else if (slot.is_available) existing.available_slots += 1;
        else existing.fully_booked_slots += 1;
        perDayMap.set(day, existing);
      }

      return {
        resource,
        query: {
          resource_id: resourceId,
          from: from.toISOString(),
          to: to.toISOString()
        },
        summary: {
          total_slots: slots.length,
          available_slots: slots.filter((s) => s.is_available).length,
          blocked_slots: slots.filter((s) => s.blocked).length,
          overlapping_bookings: bookingsResult.rows.length,
          overlapping_unavailability_blocks: blocksResult.rows.length,
          availability_exceptions: exceptions.length
        },
        per_day: Array.from(perDayMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
        slots,
        bookings: bookingsResult.rows,
        unavailability_blocks: blocksResult.rows,
        availability_exceptions: exceptions
      };
    });

    return res.json(payload);
  } catch (error) {
    return next(error);
  }
});

export default router;
