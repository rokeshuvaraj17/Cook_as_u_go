const crypto = require('crypto');
const bcrypt = require('bcrypt');

const rounds = Math.min(14, Math.max(4, parseInt(process.env.BCRYPT_ROUNDS || '10', 10) || 10));

/**
 * App-level secret from env (pepper). Read as SALT_PEPPER or salt_pepper.
 * Combined with the password via HMAC-SHA256, then bcrypt hashes that value.
 * bcrypt still embeds its own random salt inside the stored hash.
 */
function getPepper() {
  const v = process.env.SALT_PEPPER ?? process.env.salt_pepper;
  if (v === undefined || v === null) {
    return '';
  }
  return String(v);
}

function preparePassword(plain) {
  const pepper = getPepper();
  if (!pepper) {
    return String(plain);
  }
  return crypto.createHmac('sha256', pepper).update(String(plain), 'utf8').digest('hex');
}

async function hashPassword(plain) {
  const material = preparePassword(plain);
  return bcrypt.hash(material, rounds);
}

async function verifyPassword(plain, hash) {
  const material = preparePassword(plain);
  return bcrypt.compare(material, hash);
}

module.exports = { hashPassword, verifyPassword, rounds };
