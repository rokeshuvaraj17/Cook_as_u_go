const crypto = require('crypto');

const PREFIX = 'a1.'; // encrypted blob v1 (base64url after prefix)

/**
 * Separate from password pepper. Used only to derive AES-256 keys for at-rest API keys.
 * Env: SALT_PEPPER_API_KEY_SALT or salt_pepper_api_key_salt
 */
function getApiKeyMaterial() {
  const v = process.env.SALT_PEPPER_API_KEY_SALT ?? process.env.salt_pepper_api_key_salt;
  if (v == null || String(v).trim() === '') {
    throw new Error(
      'SALT_PEPPER_API_KEY_SALT (or salt_pepper_api_key_salt) must be set for API key encryption'
    );
  }
  if (String(v).length < 16) {
    throw new Error('SALT_PEPPER_API_KEY_SALT must be at least 16 characters');
  }
  return String(v);
}

function deriveKey() {
  const material = getApiKeyMaterial();
  return crypto.scryptSync(material, Buffer.from('kitchen-user-api-key-at-rest-v1', 'utf8'), 32);
}

/**
 * @param {string|null|undefined} plain
 * @returns {string|null}
 */
function encryptApiKey(plain) {
  if (plain == null || String(plain).trim() === '') {
    return null;
  }
  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const blob = Buffer.concat([iv, tag, enc]);
  return PREFIX + blob.toString('base64url');
}

/**
 * @param {string|null|undefined} stored
 * @returns {string}
 */
function decryptApiKey(stored) {
  if (stored == null || stored === '') {
    return '';
  }
  const s = String(stored);
  if (!s.startsWith(PREFIX)) {
    return '';
  }
  try {
    const buf = Buffer.from(s.slice(PREFIX.length), 'base64url');
    if (buf.length < 12 + 16 + 1) {
      return '';
    }
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const key = deriveKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}

module.exports = { encryptApiKey, decryptApiKey };
