const express = require('express');
const jwt = require('jsonwebtoken');
const { hashPassword, verifyPassword } = require('../utils/password.util');
const userRepository = require('../services/userRepository');
const { requireAuth } = require('../middleware/auth.middleware');
const { sendRouteError } = require('../utils/routeError');

const router = express.Router();

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET must be set (min 16 chars)');
  }
  return jwt.sign(
    { sub: String(user.id), email: user.email },
    secret,
    { expiresIn: '7d' }
  );
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }
    const passwordHash = await hashPassword(password);
    const result = await userRepository.createUser({ email, passwordHash, name });
    if (!result.ok) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    const user = userRepository.toPublic(result.row);
    const token = signToken(result.row);
    return res.status(201).json({ user, token });
  } catch (e) {
    if (e.message?.includes('JWT_SECRET')) {
      return res.status(500).json({ message: 'Server misconfigured: JWT_SECRET' });
    }
    return sendRouteError(res, e, 'Registration failed.');
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    const row = await userRepository.findByEmail(email);
    if (!row) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const match = await verifyPassword(password, row.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const user = userRepository.toPublic(row);
    const token = signToken(row);
    return res.status(200).json({ user, token });
  } catch (e) {
    if (e.message?.includes('JWT_SECRET')) {
      return res.status(500).json({ message: 'Server misconfigured: JWT_SECRET' });
    }
    return sendRouteError(res, e, 'Login failed.');
  }
});

router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'currentPassword and newPassword are required.' });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters.' });
    }
    const user = await userRepository.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const match = await verifyPassword(currentPassword, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }
    const passwordHash = await hashPassword(newPassword);
    const ok = await userRepository.updatePasswordHash(req.userId, passwordHash);
    if (!ok) {
      return res.status(500).json({ message: 'Could not update password.' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return sendRouteError(res, e, 'Password change failed.');
  }
});

module.exports = router;
