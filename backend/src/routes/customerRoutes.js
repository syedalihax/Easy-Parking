const express = require('express');
const {
  createCustomer,
  listCustomers,
  getCustomer,
  updateCustomer,
  deactivateCustomer,
} = require('../controllers/customerController');
const {
  createVehicle,
  listCustomerVehicles,
  updateVehicle,
  deactivateVehicle,
  replaceVehicle,
  searchVehicles,
} = require('../controllers/vehicleController');
const {
  createSubscription,
  listSubscriptions,
  changeRate,
  endSubscription,
  listDues,
} = require('../controllers/billingController');
const requireAuth = require('../middleware/auth');
const requireParkingMembership = require('../middleware/requireMembership');

const router = express.Router({ mergeParams: true });

router.use(requireAuth, requireParkingMembership);

router.get('/vehicles', searchVehicles);

router.post('/customers', createCustomer);
router.get('/customers', listCustomers);
router.get('/customers/:customerId', getCustomer);
router.patch('/customers/:customerId', updateCustomer);
router.patch('/customers/:customerId/deactivate', deactivateCustomer);

router.post('/customers/:customerId/vehicles', createVehicle);
router.get('/customers/:customerId/vehicles', listCustomerVehicles);
router.patch('/customers/:customerId/vehicles/:vehicleId', updateVehicle);
router.patch('/customers/:customerId/vehicles/:vehicleId/deactivate', deactivateVehicle);
router.post(
  '/customers/:customerId/vehicles/:oldVehicleId/replace',
  replaceVehicle,
);
router.post('/customers/:customerId/vehicles/:vehicleId/subscription', createSubscription);
router.get('/customers/:customerId/subscriptions', listSubscriptions);
router.patch('/customers/:customerId/subscriptions/:subscriptionId/rate', changeRate);
router.patch('/customers/:customerId/subscriptions/:subscriptionId/end', endSubscription);
router.get('/customers/:customerId/dues', listDues);

module.exports = router;
