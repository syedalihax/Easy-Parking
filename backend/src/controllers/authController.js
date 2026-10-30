const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const sanitizeUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email || null,
  phone: user.phone || null,
  preferredLanguage: user.preferredLanguage,
  status: user.status,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const createToken = (user) => jwt.sign(
  {
    id: user._id,
    email: user.email || null,
    phone: user.phone || null,
  },
  process.env.JWT_SECRET || 'dev-secret',
  { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
);

const signup = async (req, res) => {
  const { fullName, email, phone, password } = req.body;

  if (!fullName || !password) {
    return res.status(400).json({ message: 'Full name and password are required' });
  }

  if (!email && !phone) {
    return res.status(400).json({ message: 'Email or phone is required' });
  }

  const normalizedEmail = email ? email.trim().toLowerCase() : null;
  const normalizedPhone = phone ? phone.trim() : null;

  try {
    const existingUser = await User.findOne({
      $or: [
        normalizedEmail ? { email: normalizedEmail } : null,
        normalizedPhone ? { phone: normalizedPhone } : null,
      ].filter(Boolean),
    });

    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email or phone already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash,
    });

    const token = createToken(user);

    return res.status(201).json({
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Could not create account' });
  }
};

const login = async (req, res) => {
  const { email, phone, password } = req.body;

  const identifier = (email || phone || '').trim();

  if (!identifier || !password) {
    return res.status(400).json({ message: 'Email/phone and password are required' });
  }

  try {
    const user = await User.findOne({
      $or: [
        email ? { email: email.trim().toLowerCase() } : null,
        phone ? { phone: phone.trim() } : null,
      ].filter(Boolean),
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = createToken(user);

    return res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Could not log in' });
  }
};

const logout = (req, res) => {
  return res.json({ message: 'Logged out successfully. Delete the stored token on the client.' });
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch user profile' });
  }
};

module.exports = {
  signup,
  login,
  logout,
  getMe,
};
