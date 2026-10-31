const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const sanitizeUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email || null,
  phone: user.phone || null,
  preferredLanguage: user.preferredLanguage,
  profileCompletionPending: Boolean(user.profileCompletionPending),
  status: user.status,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

const createAccessToken = (user) => jwt.sign(
  {
    id: user._id,
    email: user.email || null,
    phone: user.phone || null,
    tokenType: 'access',
  },
  JWT_SECRET,
  { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
);

const createRefreshToken = (user) => jwt.sign(
  {
    id: user._id,
    tokenType: 'refresh',
  },
  JWT_REFRESH_SECRET,
  { expiresIn: REFRESH_TOKEN_EXPIRES_IN },
);

const createAuthTokens = (user) => ({
  accessToken: createAccessToken(user),
  refreshToken: createRefreshToken(user),
});

const cookieSameSite = process.env.NODE_ENV === 'production' ? 'none' : 'lax';
const cookieSecure = process.env.NODE_ENV === 'production';

const cookieOptions = (maxAgeMs) => ({
  httpOnly: true,
  sameSite: cookieSameSite,
  secure: cookieSecure,
  path: '/',
  maxAge: maxAgeMs,
});

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('access_token', accessToken, cookieOptions(15 * 60 * 1000));
  res.cookie('refresh_token', refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000));
};

const clearAuthCookies = (res) => {
  res.clearCookie('access_token', { httpOnly: true, sameSite: cookieSameSite, secure: cookieSecure, path: '/' });
  res.clearCookie('refresh_token', { httpOnly: true, sameSite: cookieSameSite, secure: cookieSecure, path: '/' });
};

const signup = async (req, res) => {
  const { fullName, email, phone, password, preferredLanguage } = req.body;
  const supportedLanguages = ['en', 'fa-IR', 'ur', 'ur-Latn'];
  if (preferredLanguage !== undefined && !supportedLanguages.includes(preferredLanguage)) {
    return res.status(400).json({ message: 'Unsupported preferred language' });
  }

  if (typeof fullName !== 'string' || !fullName.trim() || typeof password !== 'string' || !password) {
    return res.status(400).json({ message: 'Full name and password are required' });
  }

  if (
    (email !== undefined && typeof email !== 'string') ||
    (phone !== undefined && typeof phone !== 'string')
  ) {
    return res.status(400).json({ message: 'Email and phone must be text values' });
  }

  if (!(email && email.trim()) && !(phone && phone.trim())) {
    return res.status(400).json({ message: 'Email or phone is required' });
  }

  const normalizedEmail = email && email.trim() ? email.trim().toLowerCase() : undefined;
  const normalizedPhone = phone && phone.trim() ? phone.trim() : undefined;

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

    const userDetails = {
      fullName: fullName.trim(),
      passwordHash,
      profileCompletionPending: true,
    };

    if (preferredLanguage) userDetails.preferredLanguage = preferredLanguage;
    if (normalizedEmail) userDetails.email = normalizedEmail;
    if (normalizedPhone) userDetails.phone = normalizedPhone;

    const user = await User.create(userDetails);
    const { accessToken, refreshToken } = createAuthTokens(user);
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with this email or phone already exists' });
    }

    console.error('Signup failed:', error);
    return res.status(500).json({ message: 'Could not create account' });
  }
};

const login = async (req, res) => {
  const { email, phone, password } = req.body;

  if (
    (email !== undefined && typeof email !== 'string') ||
    (phone !== undefined && typeof phone !== 'string') ||
    typeof password !== 'string'
  ) {
    return res.status(400).json({ message: 'Email/phone and password are required' });
  }

  const normalizedEmail = email && email.trim() ? email.trim().toLowerCase() : undefined;
  const normalizedPhone = phone && phone.trim() ? phone.trim() : undefined;

  if ((!normalizedEmail && !normalizedPhone) || !password) {
    return res.status(400).json({ message: 'Email/phone and password are required' });
  }

  try {
    const user = await User.findOne({
      $or: [
        normalizedEmail ? { email: normalizedEmail } : null,
        normalizedPhone ? { phone: normalizedPhone } : null,
      ].filter(Boolean),
    });

    if (!user || user.status !== 'active') {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const { accessToken, refreshToken } = createAuthTokens(user);
    setAuthCookies(res, accessToken, refreshToken);

    return res.json({
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Login failed:', error);
    return res.status(500).json({ message: 'Could not log in' });
  }
};

const refresh = async (req, res) => {
  const refreshToken = req.cookies?.refresh_token;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token is required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    if (decoded.tokenType !== 'refresh') {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const user = await User.findById(decoded.id);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ message: 'Session expired' });
    }

    const { accessToken, refreshToken: nextRefreshToken } = createAuthTokens(user);
    setAuthCookies(res, accessToken, nextRefreshToken);

    return res.json({
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Refresh token failed:', error);
    return res.status(401).json({ message: 'Session expired' });
  }
};

const logout = (req, res) => {
  clearAuthCookies(res);
  return res.json({ message: 'Logged out successfully.' });
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error('Profile lookup failed:', error);
    return res.status(500).json({ message: 'Could not fetch user profile' });
  }
};

const updateMe = async (req, res) => {
  const allowedFields = new Set(['fullName', 'email', 'phone', 'preferredLanguage']);
  if (Object.keys(req.body).some((field) => !allowedFields.has(field))) {
    return res.status(400).json({ message: 'Only profile details and preferred language can be updated' });
  }

  const { fullName, email, phone, preferredLanguage } = req.body;
  if (preferredLanguage !== undefined && !['en', 'fa-IR', 'ur', 'ur-Latn'].includes(preferredLanguage)) {
    return res.status(400).json({ message: 'Unsupported preferred language' });
  }

  if (fullName !== undefined && (typeof fullName !== 'string' || !fullName.trim())) {
    return res.status(400).json({ message: 'Name cannot be empty' });
  }
  if (email !== undefined && typeof email !== 'string') {
    return res.status(400).json({ message: 'Email must be text' });
  }
  if (phone !== undefined && typeof phone !== 'string') {
    return res.status(400).json({ message: 'Phone must be text' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (fullName !== undefined) user.fullName = fullName.trim();
    if (email !== undefined) user.email = email.trim() ? email.trim().toLowerCase() : undefined;
    if (phone !== undefined) user.phone = phone.trim() || undefined;
    if (preferredLanguage !== undefined) user.preferredLanguage = preferredLanguage;
    if (!user.email && !user.phone) {
      return res.status(400).json({ message: 'At least one email address or phone number is required' });
    }

    const hasRequiredProfileDetails = user.fullName && (user.email || user.phone);
    user.profileCompletionPending = !hasRequiredProfileDetails;

    await user.save();
    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.hasOwn(error.keyPattern || {}, 'email') ? 'email' : 'phone';
      return res.status(409).json({ message: `This ${field} is already used by another account` });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    console.error('Profile update failed:', error);
    return res.status(500).json({ message: 'Could not update user profile' });
  }
};

module.exports = {
  signup,
  login,
  refresh,
  logout,
  getMe,
  updateMe,
};
