import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

export const pool = new Pool(
  config.databaseUrl
    ? { connectionString: config.databaseUrl, max: 20, idleTimeoutMillis: 30000 }
    : {
        host: config.db.host,
        port: config.db.port,
        database: config.db.database,
        user: config.db.user,
        password: config.db.password,
        max: 20,
        idleTimeoutMillis: 30000
      }
);

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error', err);
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function withClient(fn) {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function withTenantContext(tenantId, fn) {
  return withClient(async (client) => {
    await client.query('BEGIN');
    try {
      await client.query('SELECT app.set_current_tenant($1::uuid)', [tenantId]);
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      // no-op
    }
    throw error;
  } finally {
    client.release();
  }
}

