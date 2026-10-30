const express = require('express');
const {
  createPayment,
  previewPayment,
  listPayments,
  getPayment,
  requestCorrection,
  approveCorrection,
  rejectCorrection,
} = require('../controllers/paymentController');
const requireAuth = require('../middleware/auth');
const requireParkingMembership = require('../middleware/requireMembership');
const requireOwnerRole = require('../middleware/requireOwner');

const router = express.Router({ mergeParams: true });

router.use(requireAuth, requireParkingMembership);
router.post('/customers/:customerId/payments/preview', previewPayment);
router.post('/customers/:customerId/payments', createPayment);
router.get('/customers/:customerId/payments', listPayments);
router.get('/customers/:customerId/payments/:paymentId', getPayment);
router.post('/payments/:paymentId/corrections/request', requestCorrection);
router.post('/payments/:paymentId/corrections/:auditLogId/approve', requireOwnerRole, approveCorrection);
router.post('/payments/:paymentId/corrections/:auditLogId/reject', requireOwnerRole, rejectCorrection);

module.exports = router;
