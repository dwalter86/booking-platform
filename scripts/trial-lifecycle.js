#!/usr/bin/env node
/**
 * trial-lifecycle.js
 * Runs daily via cron. Transitions tenant subscriptions through:
 *   trial  → grace     (when current_period_end has passed)
 *   grace  → cancelled (when grace period has also passed)
 *   Also suspends the tenant when grace expires.
 */

import pg from 'pg';
import { readFileSync } from 'fs';

const GRACE_PERIOD_DAYS = 14;

const pool = new pg.Pool({
  host:     process.env.DB_HOST     || '192.168.0.133',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'booking_platform',
  user:     process.env.DB_USER     || 'booking_app',
  password: process.env.DB_PASSWORD,
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. trial → grace: trial subscriptions whose period_end has passed
    const toGrace = await client.query(`
      UPDATE public.tenant_subscriptions
      SET status     = 'grace',
          updated_at = now()
      WHERE status = 'trial'
        AND current_period_end < now()
      RETURNING tenant_id, current_period_end
    `);
    console.log(`[trial-lifecycle] trial → grace: ${toGrace.rowCount} subscription(s)`);

    // 2. grace → cancelled: grace subscriptions whose grace window has also passed
    const graceExpired = await client.query(`
      UPDATE public.tenant_subscriptions
      SET status     = 'cancelled',
          updated_at = now()
      WHERE status = 'grace'
        AND current_period_end + ($1 || ' days')::interval < now()
      RETURNING tenant_id
    `, [GRACE_PERIOD_DAYS]);
    console.log(`[trial-lifecycle] grace → cancelled: ${graceExpired.rowCount} subscription(s)`);

    // 3. Suspend tenants whose subscription just expired
    if (graceExpired.rowCount > 0) {
      const expiredTenantIds = graceExpired.rows.map(r => r.tenant_id);
      const suspended = await client.query(`
        UPDATE public.tenants
        SET status     = 'suspended',
            updated_at = now()
        WHERE id = ANY($1::uuid[])
          AND status = 'active'
        RETURNING id, name, subdomain
      `, [expiredTenantIds]);
      console.log(`[trial-lifecycle] suspended ${suspended.rowCount} tenant(s):`);
      suspended.rows.forEach(t => console.log(`  - ${t.name} (${t.subdomain})`));
    }

    await client.query('COMMIT');
    console.log('[trial-lifecycle] Done.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[trial-lifecycle] ERROR — rolled back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
