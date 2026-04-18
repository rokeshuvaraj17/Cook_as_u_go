/**
 * Deletes all rows from app tables. Uses DIRECT_URL when set (better for DDL-heavy ops).
 * Run: npm run db:purge
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');

function needsSsl(url) {
  return (
    url.includes('supabase') ||
    url.includes('sslmode=require') ||
    process.env.DATABASE_SSL === 'true'
  );
}

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error('Missing DIRECT_URL or DATABASE_URL in .env');
    process.exit(1);
  }
  const client = new Client({
    connectionString: url,
    ssl: needsSsl(url) ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  await client.query('TRUNCATE TABLE kitchen_items');
  await client.query('TRUNCATE TABLE ingredient_aliases');
  await client.query('TRUNCATE TABLE ingredients_master');
  await client.query('TRUNCATE TABLE units');
  await client.query('TRUNCATE TABLE app_users');
  await client.end();
  console.log('All rows removed from kitchen tables and app_users.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
