'use strict';

const DB_UNAVAILABLE = 'DB_UNAVAILABLE';

/**
 * Map known DB outage errors to 503; otherwise log and return 500 with fallbackMessage.
 */
function sendRouteError(res, err, fallbackMessage) {
  if (err && err.code === DB_UNAVAILABLE) {
    return res.status(503).json({
      message:
        'Database is temporarily unavailable. Check DATABASE_URL / DIRECT_URL and that Postgres is reachable.',
      code: DB_UNAVAILABLE,
    });
  }
  console.error(err);
  return res.status(500).json({ message: fallbackMessage });
}

module.exports = { sendRouteError, DB_UNAVAILABLE };
