/**
 * Slot Generator
 *
 * Pure logic — no DB calls. Takes pre-fetched data and produces
 * either discrete bookable slots (slot mode) or free windows (free mode).
 *
 * Time handling:
 * - Rules store local times (HH:MM:SS) without timezone
 * - Dates are iterated as calendar dates (YYYY-MM-DD)
 * - Output slot times are UTC ISO strings, converted using the resource timezone
 */

import { DateTime } from 'luxon';

// ---------------------------------------------------------------------------
// Types (JSDoc — no TypeScript in services, consistent with your codebase)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} AvailabilityRule
 * @property {string} id
 * @property {number} day_of_week        - 0 (Sun) to 6 (Sat)
 * @property {string} start_time         - "HH:MM:SS"
 * @property {string} end_time           - "HH:MM:SS"
 * @property {number|null} slot_duration_minutes
 * @property {number|null} slot_interval_minutes
 * @property {boolean} is_open
 */

/**
 * @typedef {Object} AvailabilityException
 * @property {string} exception_date     - "YYYY-MM-DD"
 * @property {string|null} start_time
 * @property {string|null} end_time
 * @property {boolean} is_closed
 */

/**
 * @typedef {Object} UnavailabilityBlock
 * @property {string} start_at           - ISO datetime
 * @property {string} end_at             - ISO datetime
 */

/**
 * @typedef {Object} Booking
 * @property {string} start_at
 * @property {string} end_at
 * @property {string} status
 * @property {number} quantity
 */

/**
 * @typedef {Object} GeneratorOptions
 * @property {string}   resourceId
 * @property {number}   capacity          - resource.capacity
 * @property {string}   timezone          - IANA timezone e.g. "Europe/London"
 * @property {string}   fromDate          - "YYYY-MM-DD" inclusive
 * @property {string}   toDate            - "YYYY-MM-DD" inclusive
 * @property {AvailabilityRule[]}      rules
 * @property {AvailabilityException[]} exceptions
 * @property {UnavailabilityBlock[]}   blocks
 * @property {Booking[]}               bookings
 * @property {number}   [defaultSlotDuration=60]   - fallback if rule has no duration
 * @property {number}   [defaultSlotInterval=null]  - fallback interval; null = same as duration
 */

/**
 * @typedef {Object} Slot
 * @property {string}  start_at
 * @property {string}  end_at
 * @property {boolean} blocked
 * @property {number}  booked_count
 * @property {number}  available_capacity
 * @property {boolean} is_available
 * @property {string}  mode              - "slot" | "free"
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse "HH:MM:SS" or "HH:MM" into { hours, minutes, seconds }
 */
function parseTime(timeStr) {
  const [hours, minutes, seconds = 0] = timeStr.split(':').map(Number);
  return { hours, minutes, seconds };
}

/**
 * Given a calendar date string and a time string, return a DateTime in the
 * given timezone.
 */
export function toZonedDateTime(dateStr, timeStr, timezone) {
  const { hours, minutes, seconds } = parseTime(timeStr);
  return DateTime.fromObject(
    {
      year:   parseInt(dateStr.slice(0, 4)),
      month:  parseInt(dateStr.slice(5, 7)),
      day:    parseInt(dateStr.slice(8, 10)),
      hour:   hours,
      minute: minutes,
      second: seconds,
    },
    { zone: timezone }
  );
}

/**
 * Check whether a UTC interval overlaps a block or booking.
 * All inputs are JS Date objects.
 */
function overlapsInterval(slotStart, slotEnd, intervalStart, intervalEnd) {
  return intervalStart < slotEnd && intervalEnd > slotStart;
}

/**
 * Sum quantity of active bookings overlapping a window.
 */
function bookedQuantityInWindow(bookings, slotStart, slotEnd) {
  return bookings
    .filter(
      (b) =>
        b.status !== 'cancelled' &&
        overlapsInterval(slotStart, slotEnd, new Date(b.start_at), new Date(b.end_at))
    )
    .reduce((sum, b) => sum + Number(b.quantity || 1), 0);
}

/**
 * Check whether any unavailability block overlaps a window.
 */
function isBlocked(blocks, slotStart, slotEnd) {
  return blocks.some((bl) =>
    overlapsInterval(slotStart, slotEnd, new Date(bl.start_at), new Date(bl.end_at))
  );
}

// ---------------------------------------------------------------------------
// Core: resolve open windows for a single date
// ---------------------------------------------------------------------------

/**
 * Returns the open time windows for a given calendar date, after applying
 * rules and exceptions.
 *
 * Returns an array of { start: DateTime, end: DateTime } in the resource tz.
 * Returns an empty array if the day is closed or has no applicable rules.
 *
 * @param {string} dateStr              - "YYYY-MM-DD"
 * @param {number} dayOfWeek            - 0–6 matching JS Date.getDay()
 * @param {AvailabilityRule[]} rules
 * @param {AvailabilityException[]} exceptions
 * @param {string} timezone
 * @returns {{ start: DateTime, end: DateTime }[]}
 */
function resolveOpenWindowsForDate(dateStr, dayOfWeek, rules, exceptions, timezone) {
  // 1. Check for an exception on this specific date
  const dateExceptions = exceptions.filter((e) => e.exception_date === dateStr);

  if (dateExceptions.length > 0) {
    // If any exception is a full closure, day is closed
    if (dateExceptions.some((e) => e.is_closed)) return [];

    // Otherwise use exception windows (may be extended/modified hours)
    return dateExceptions
      .filter((e) => e.start_time && e.end_time)
      .map((e) => ({
        start: toZonedDateTime(dateStr, e.start_time, timezone),
        end:   toZonedDateTime(dateStr, e.end_time,   timezone),
      }))
      .filter((w) => w.end > w.start);
  }

  // 2. No exception — apply matching rules for this day_of_week
  const dayRules = rules.filter(
    (r) => r.is_open && r.day_of_week === dayOfWeek
  );

  if (dayRules.length === 0) return [];

  return dayRules.map((r) => ({
    start: toZonedDateTime(dateStr, r.start_time, timezone),
    end:   toZonedDateTime(dateStr, r.end_time,   timezone),
    rule:  r, // carry rule ref so slot generator can read duration/interval
  }));
}

// ---------------------------------------------------------------------------
// Core: generate slots from a single open window
// ---------------------------------------------------------------------------

/**
 * Expands one open window into discrete slots.
 *
 * @param {{ start: DateTime, end: DateTime, rule?: AvailabilityRule }} window
 * @param {number} capacity
 * @param {UnavailabilityBlock[]} blocks
 * @param {Booking[]} bookings
 * @param {number} defaultDuration
 * @param {number|null} defaultInterval
 * @returns {Slot[]}
 */
function generateSlotsFromWindow(
  window,
  capacity,
  blocks,
  bookings,
  defaultDuration,
  defaultInterval
) {
  const rule = window.rule || null;
  const durationMins = rule?.slot_duration_minutes || defaultDuration;
  const intervalMins = rule?.slot_interval_minutes || defaultInterval || durationMins;
  const mode = durationMins ? 'slot' : 'free';

  // Free booking mode — return the window itself as a single entry
  if (mode === 'free') {
    const slotStart = window.start.toJSDate();
    const slotEnd   = window.end.toJSDate();
    const blocked   = isBlocked(blocks, slotStart, slotEnd);
    const booked    = bookedQuantityInWindow(bookings, slotStart, slotEnd);
    const available = Math.max(0, capacity - booked);

    return [{
      start_at:           slotStart.toISOString(),
      end_at:             slotEnd.toISOString(),
      blocked,
      booked_count:       booked,
      available_capacity: available,
      is_available:       !blocked && available > 0,
      mode:               'free',
    }];
  }

  // Slot mode — carve window into fixed-duration slots
  const slots = [];
  let cursor = window.start;

  while (true) {
    const slotEnd = cursor.plus({ minutes: durationMins });
    if (slotEnd > window.end) break;

    const slotStart = cursor.toJSDate();
    const slotEndJs = slotEnd.toJSDate();

    const blocked = isBlocked(blocks, slotStart, slotEndJs);
    const booked  = bookedQuantityInWindow(bookings, slotStart, slotEndJs);
    const available = Math.max(0, capacity - booked);

    slots.push({
      start_at:           slotStart.toISOString(),
      end_at:             slotEndJs.toISOString(),
      blocked,
      booked_count:       booked,
      available_capacity: available,
      is_available:       !blocked && available > 0,
      mode:               'slot',
    });

    cursor = cursor.plus({ minutes: intervalMins });
  }

  return slots;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Main entry point. Iterates over each calendar date in the range,
 * resolves open windows, and generates slots.
 *
 * @param {GeneratorOptions} options
 * @returns {{ slots: Slot[], perDay: Object[] }}
 */
export function generateAvailability(options) {
  const {
    capacity,
    timezone,
    fromDate,
    toDate,
    rules,
    exceptions,
    blocks,
    bookings,
    defaultSlotDuration = 60,
    defaultSlotInterval = null,
  } = options;

  const allSlots = [];
  const perDayMap = new Map();

  // Iterate calendar dates inclusive
  let cursor = DateTime.fromISO(fromDate, { zone: timezone }).startOf('day');
  const end  = DateTime.fromISO(toDate,   { zone: timezone }).endOf('day');

  while (cursor <= end) {
    const dateStr  = cursor.toFormat('yyyy-MM-dd');
    const dayOfWeek = cursor.weekday % 7; // luxon: 1=Mon..7=Sun → convert to 0=Sun..6=Sat

    const openWindows = resolveOpenWindowsForDate(
      dateStr, dayOfWeek, rules, exceptions, timezone
    );

    const daySlots = openWindows.flatMap((window) =>
      generateSlotsFromWindow(
        window, capacity, blocks, bookings,
        defaultSlotDuration, defaultSlotInterval
      )
    );

    allSlots.push(...daySlots);

    // Per-day summary
    perDayMap.set(dateStr, {
      date:               dateStr,
      is_open:            openWindows.length > 0,
      total_slots:        daySlots.length,
      available_slots:    daySlots.filter((s) => s.is_available).length,
      blocked_slots:      daySlots.filter((s) => s.blocked).length,
      fully_booked_slots: daySlots.filter((s) => !s.is_available && !s.blocked).length,
    });

    cursor = cursor.plus({ days: 1 });
  }

  return {
    slots:   allSlots,
    per_day: Array.from(perDayMap.values()),
  };
}
