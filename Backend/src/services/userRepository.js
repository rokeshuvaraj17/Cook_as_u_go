const { query } = require('../db/pool');

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function toPublic(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    email: row.email,
    name: row.name || row.email.split('@')[0] || 'User',
  };
}

async function findByEmail(email) {
  const key = normalizeEmail(email);
  const r = await query(
    `SELECT id, email, name, password_hash
     FROM app_users
     WHERE lower(trim(email)) = $1
     LIMIT 1`,
    [key]
  );
  return r.rows[0] || null;
}

async function createUser({ email, passwordHash, name }) {
  const key = normalizeEmail(email);
  const displayName = name != null && String(name).trim() ? String(name).trim() : key.split('@')[0];
  try {
    const r = await query(
      `INSERT INTO app_users (email, name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, name`,
      [key, displayName, passwordHash]
    );
    return { ok: true, row: r.rows[0] };
  } catch (e) {
    if (e.code === '23505') {
      return { ok: false, code: 'EMAIL_TAKEN' };
    }
    throw e;
  }
}

module.exports = { findByEmail, createUser, toPublic };
