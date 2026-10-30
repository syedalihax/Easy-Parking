const express = require('express');
const { createParking, getMyParkings } = require('../controllers/parkingController');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, createParking);
router.get('/my', requireAuth, getMyParkings);

module.exports = router;
