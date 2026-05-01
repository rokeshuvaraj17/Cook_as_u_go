const { Pool } = require('pg');
const { isDbSchemaReady } = require('./dbState');

let pool;

const DB_UNAVAILABLE = 'DB_UNAVAILABLE';

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

function dbUnavailableError(reason) {
  const e = new Error(reason || 'Database is unavailable.');
  e.code = DB_UNAVAILABLE;
  return e;
}

function isTransientDbNetworkError(err) {
  if (!err || !err.code) {
    return false;
  }
  return (
    err.code === 'ENOTFOUND' ||
    err.code === 'ECONNREFUSED' ||
    err.code === 'ETIMEDOUT' ||
    err.code === 'EAI_AGAIN' ||
    err.code === 'ECONNRESET'
  );
}

function getPool() {
  if (!isDbSchemaReady()) {
    throw dbUnavailableError('Database schema was not initialized at startup.');
  }
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
    if (!connectionString) {
      throw dbUnavailableError('DATABASE_URL or DIRECT_URL is not configured.');
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
  if (!isDbSchemaReady()) {
    throw dbUnavailableError('Database schema was not initialized at startup.');
  }
  try {
    return await getPool().query(text, params);
  } catch (err) {
    if (isTransientDbNetworkError(err)) {
      const wrapped = dbUnavailableError(err.message || 'Database connection failed.');
      wrapped.cause = err;
      throw wrapped;
    }
    throw err;
  }
}

async function acquireClient() {
  const p = getPool();
  try {
    return await p.connect();
  } catch (err) {
    if (isTransientDbNetworkError(err)) {
      const wrapped = dbUnavailableError(err.message || 'Database connection failed.');
      wrapped.cause = err;
      throw wrapped;
    }
    throw err;
  }
}

module.exports = { getPool, query, acquireClient, dbUnavailableError, DB_UNAVAILABLE };
