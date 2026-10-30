const express = require('express');
const { signup, login, refresh, logout, getMe, updateMe } = require('../controllers/authController');
const requireAuth = require('../middleware/auth');
const { rateLimit } = require('express-rate-limit');

const router = express.Router();
const authenticationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

router.post('/signup', authenticationLimiter, signup);
router.post('/login', authenticationLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);
router.patch('/me', requireAuth, updateMe);

module.exports = router;
