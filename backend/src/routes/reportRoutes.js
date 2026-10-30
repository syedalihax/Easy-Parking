const express = require('express');
const {
  getCustomerStatement,
  listActiveVehiclesReport,
  listCustomersReport,
  listDailyParkingHistoryReport,
  listOutstandingBalancesReport,
  listPaymentHistoryReport,
  listPendingDuesReport,
} = require('../controllers/reportController');
const requireAuth = require('../middleware/auth');
const requireParkingMembership = require('../middleware/requireMembership');

const router = express.Router({ mergeParams: true });
router.use(requireAuth, requireParkingMembership);
router.get('/customers', listCustomersReport);
router.get('/active-vehicles', listActiveVehiclesReport);
router.get('/pending-dues', listPendingDuesReport);
router.get('/outstanding-balances', listOutstandingBalancesReport);
router.get('/payment-history', listPaymentHistoryReport);
router.get('/daily-parking-history', listDailyParkingHistoryReport);
router.get('/customer-statement/:customerId', getCustomerStatement);

module.exports = router;
