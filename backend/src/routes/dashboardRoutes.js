const express = require('express');
const { getDashboard, getDashboardReminders } = require('../controllers/dashboardController');
const requireAuth = require('../middleware/auth');
const requireParkingMembership = require('../middleware/requireMembership');

const router = express.Router({ mergeParams: true });
router.use(requireAuth, requireParkingMembership);
router.get('/', getDashboard);
router.get('/reminders', getDashboardReminders);

module.exports = router;
