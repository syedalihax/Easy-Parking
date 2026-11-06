const express = require('express');
const { listParkingInvitations, cancelInvitation } = require('../controllers/invitationController');
const requireAuth = require('../middleware/auth');
const requireParkingMembership = require('../middleware/requireMembership');
const requireOwnerRole = require('../middleware/requireOwner');

// Sent invitations for one parking. Mounted at /api/parkings/:parkingId/invitations.
const router = express.Router({ mergeParams: true });
router.use(requireAuth, requireParkingMembership);

router.get('/', listParkingInvitations);
router.post('/:invitationId/cancel', requireOwnerRole, cancelInvitation);

module.exports = router;
