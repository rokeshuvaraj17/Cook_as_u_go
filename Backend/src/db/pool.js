const { Pool } = require('pg');

let pool;

function needsSsl(connectionString) {
  if (!connectionString) {
    return false;
  }
  return (
    connectionString.includes('supabase') ||
    connectionString.includes('sslmode=require') ||
    process.env.DATABASE_SSL === 'true'
  );
}

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required (Supabase pooler connection string).');
    }
    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      ssl: needsSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

async function query(text, params) {
  return getPool().query(text, params);
}

module.exports = { getPool, query };
