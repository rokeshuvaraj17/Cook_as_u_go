const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { setDbSchemaReady } = require('./dbState');

function needsSsl(url) {
  if (!url) {
    return false;
  }
  return url.includes('supabase') || url.includes('sslmode=require') || process.env.DATABASE_SSL === 'true';
}

/**
 * Run DDL on DIRECT_URL when possible (avoids PgBouncer transaction-pooling quirks).
 * Never throws: on failure the HTTP server can still start (degraded mode).
 */
async function initDb() {
  try {
    const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!url) {
      console.warn(
        '[kitchen-api] No DIRECT_URL or DATABASE_URL — Postgres skipped. Set one to enable auth and pantry API.'
      );
      setDbSchemaReady(false, new Error('Database URL not configured'));
      return;
    }

    const client = new Client({
      connectionString: url,
      ssl: needsSsl(url) ? { rejectUnauthorized: false } : undefined,
    });

    try {
      await client.connect();
      await client.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

      const kitchenSqlPath = path.join(__dirname, 'schemaKitchen.sql');
      const kitchenSql = fs.readFileSync(kitchenSqlPath, 'utf8');
      await client.query(kitchenSql);

      setDbSchemaReady(true, null);
      console.log('Database schema ready (app_users, kitchen / pantry tables).');
    } catch (err) {
      console.warn(
        '[kitchen-api] Could not connect or migrate Postgres — API runs in degraded mode:',
        err.message || err
      );
      setDbSchemaReady(false, err);
    } finally {
      try {
        await client.end();
      } catch (_) {
        /* ignore */
      }
    }
  } catch (unexpected) {
    console.error('[kitchen-api] Unexpected error during database init:', unexpected);
    setDbSchemaReady(false, unexpected instanceof Error ? unexpected : new Error(String(unexpected)));
  }
}

module.exports = { initDb };
