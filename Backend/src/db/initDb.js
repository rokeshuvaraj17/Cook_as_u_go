const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function needsSsl(url) {
  if (!url) {
    return false;
  }
  return url.includes('supabase') || url.includes('sslmode=require') || process.env.DATABASE_SSL === 'true';
}

/**
 * Run DDL on DIRECT_URL when possible (avoids PgBouncer transaction-pooling quirks).
 */
async function initDb() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('Set DIRECT_URL (recommended) or DATABASE_URL for Supabase Postgres.');
  }
  const client = new Client({
    connectionString: url,
    ssl: needsSsl(url) ? { rejectUnauthorized: false } : undefined,
  });
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

  await client.end();
  console.log('Database schema ready (app_users, kitchen / pantry tables).');
}

module.exports = { initDb };
