const express = require('express');
const {
  createInvitation,
  getPendingInvitations,
  acceptInvitation,
} = require('../controllers/invitationController');
const requireAuth = require('../middleware/auth');
const requireParkingMembership = require('../middleware/requireMembership');
const requireOwnerRole = require('../middleware/requireOwner');

const router = express.Router();

router.post(
  '/',
  requireAuth,
  requireParkingMembership,
  requireOwnerRole,
  createInvitation,
);

router.get('/pending', requireAuth, getPendingInvitations);
router.post('/:id/accept', requireAuth, acceptInvitation);

module.exports = router;
