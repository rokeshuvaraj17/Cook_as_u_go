/**
 * One-off: set api_key to NULL for all rows (e.g. before migrating to encrypted-at-rest keys).
 * Usage from Backend/: node -r dotenv/config scripts/clearUserApiKeys.js
 */
require('dotenv').config();
const { Client } = require('pg');

function needsSsl(url) {
  if (!url) return false;
  return url.includes('supabase') || url.includes('sslmode=require') || process.env.DATABASE_SSL === 'true';
}

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error('Set DIRECT_URL or DATABASE_URL');
    process.exit(1);
  }
  const client = new Client({
    connectionString: url,
    ssl: needsSsl(url) ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  const r = await client.query(
    `UPDATE user_api_settings SET api_key = NULL, updated_at = NOW() WHERE api_key IS NOT NULL`
  );
  await client.end();
  console.log(`Cleared api_key on ${r.rowCount} row(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
