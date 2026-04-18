const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header.' });
  }
  const token = header.slice(7).trim();
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    return res.status(500).json({ message: 'Server misconfigured: JWT_SECRET' });
  }
  try {
    const payload = jwt.verify(token, secret);
    const sub = payload.sub;
    if (!sub) {
      return res.status(401).json({ message: 'Invalid token payload.' });
    }
    req.userId = sub;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

module.exports = { requireAuth };
