const express = require('express');
const { signup, login, logout, getMe, updateMe } = require('../controllers/authController');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);
router.patch('/me', requireAuth, updateMe);

module.exports = router;
