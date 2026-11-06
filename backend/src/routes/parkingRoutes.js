const express = require('express');
const { createParking, getMyParkings, updateParking } = require('../controllers/parkingController');
const requireAuth = require('../middleware/auth');
const requireParkingMembership = require('../middleware/requireMembership');
const requireOwnerRole = require('../middleware/requireOwner');

const router = express.Router();

router.post('/', requireAuth, createParking);
router.get('/my', requireAuth, getMyParkings);
router.patch('/:parkingId', requireAuth, requireParkingMembership, requireOwnerRole, updateParking);

module.exports = router;
