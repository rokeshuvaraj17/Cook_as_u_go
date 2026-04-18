const express = require('express');
const jwt = require('jsonwebtoken');
const { hashPassword, verifyPassword } = require('../utils/password.util');
const userRepository = require('../services/userRepository');

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
    if (e.message?.includes('DATABASE_URL')) {
      return res.status(500).json({ message: 'Server misconfigured: database' });
    }
    console.error(e);
    return res.status(500).json({ message: 'Registration failed.' });
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
    console.error(e);
    return res.status(500).json({ message: 'Login failed.' });
  }
});

module.exports = router;
