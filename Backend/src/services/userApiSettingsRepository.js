const { query } = require('../db/pool');
const { encryptApiKey, decryptApiKey } = require('../utils/apiKeyCrypto.util');

function toDto(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    label: row.label,
    api_type: row.api_type,
    provider: row.provider || '',
    model: row.model || '',
    base_url: row.base_url,
    api_key: decryptApiKey(row.api_key),
    is_default: row.is_default,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function listByUser(userId) {
  const r = await query(
    `SELECT id, user_id, label, api_type, provider, model, base_url, api_key, is_default, created_at, updated_at
     FROM user_api_settings
     WHERE user_id = $1
     ORDER BY api_type ASC, is_default DESC, updated_at DESC`,
    [userId]
  );
  return r.rows.map(toDto);
}

async function createForUser(userId, body) {
  const r = await query(
    `INSERT INTO user_api_settings (user_id, label, api_type, provider, model, base_url, api_key, is_default)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, user_id, label, api_type, provider, model, base_url, api_key, is_default, created_at, updated_at`,
    [
      userId,
      body.label,
      body.api_type,
      body.provider || null,
      body.model || null,
      body.base_url,
      encryptApiKey(body.api_key),
      Boolean(body.is_default),
    ]
  );
  return toDto(r.rows[0]);
}

async function updateForUser(userId, id, body) {
  const r = await query(
    `UPDATE user_api_settings
     SET
       label = COALESCE($3, label),
       api_type = COALESCE($4, api_type),
       provider = COALESCE($5, provider),
       model = COALESCE($6, model),
       base_url = COALESCE($7, base_url),
       api_key = CASE WHEN $8::boolean THEN NULL ELSE COALESCE($9, api_key) END,
       is_default = COALESCE($10, is_default),
       updated_at = NOW()
     WHERE user_id = $1 AND id = $2
     RETURNING id, user_id, label, api_type, provider, model, base_url, api_key, is_default, created_at, updated_at`,
    [
      userId,
      id,
      body.label ?? null,
      body.api_type ?? null,
      body.provider ?? null,
      body.model ?? null,
      body.base_url ?? null,
      Boolean(body.clear_api_key),
      body.api_key != null ? encryptApiKey(body.api_key) : null,
      body.is_default == null ? null : Boolean(body.is_default),
    ]
  );
  return r.rows[0] ? toDto(r.rows[0]) : null;
}

async function removeForUser(userId, id) {
  const r = await query(
    `DELETE FROM user_api_settings
     WHERE user_id = $1 AND id = $2
     RETURNING id`,
    [userId, id]
  );
  return Boolean(r.rows[0]);
}

async function setDefaultForUser(userId, apiType, id) {
  await query(
    `UPDATE user_api_settings
     SET is_default = FALSE, updated_at = NOW()
     WHERE user_id = $1 AND api_type = $2`,
    [userId, apiType]
  );
  const r = await query(
    `UPDATE user_api_settings
     SET is_default = TRUE, updated_at = NOW()
     WHERE user_id = $1 AND api_type = $2 AND id = $3
     RETURNING id, user_id, label, api_type, provider, model, base_url, api_key, is_default, created_at, updated_at`,
    [userId, apiType, id]
  );
  return r.rows[0] ? toDto(r.rows[0]) : null;
}

/** Default LLM row for receipt scan proxy (plaintext key for upstream headers). */
async function getDefaultLlmForScan(userId) {
  const r = await query(
    `SELECT base_url, api_key, model, provider
     FROM user_api_settings
     WHERE user_id = $1 AND is_default = TRUE
     ORDER BY CASE WHEN lower(api_type) = 'global' THEN 0 ELSE 1 END, updated_at DESC
     LIMIT 1`,
    [userId]
  );
  const row = r.rows[0];
  if (!row) return null;
  return {
    base_url: row.base_url,
    api_key: decryptApiKey(row.api_key),
    model: row.model,
    provider: row.provider,
  };
}

module.exports = {
  listByUser,
  createForUser,
  updateForUser,
  removeForUser,
  setDefaultForUser,
  getDefaultLlmForScan,
};
