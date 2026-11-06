const express = require('express');
const {
  createCustomer,
  listCustomers,
  getCustomer,
  updateCustomer,
  deactivateCustomer,
  activateCustomer,
  deleteCustomer,
} = require('../controllers/customerController');
const {
  createVehicle,
  listCustomerVehicles,
  updateVehicle,
  deactivateVehicle,
  activateVehicle,
  deleteVehicle,
  replaceVehicle,
  searchVehicles,
  getVehicle,
} = require('../controllers/vehicleController');
const {
  createSubscription,
  listSubscriptions,
  changeRate,
  endSubscription,
  listDues,
  createCurrentDue,
} = require('../controllers/billingController');
const requireAuth = require('../middleware/auth');
const requireParkingMembership = require('../middleware/requireMembership');

const router = express.Router({ mergeParams: true });

router.use(requireAuth, requireParkingMembership);

router.get('/vehicles', searchVehicles);
router.get('/vehicles/:vehicleId', getVehicle);

router.post('/customers', createCustomer);
router.get('/customers', listCustomers);
router.get('/customers/:customerId', getCustomer);
router.patch('/customers/:customerId', updateCustomer);
router.patch('/customers/:customerId/activate', activateCustomer);
router.patch('/customers/:customerId/deactivate', deactivateCustomer);
router.delete('/customers/:customerId', deleteCustomer);

router.post('/customers/:customerId/vehicles', createVehicle);
router.get('/customers/:customerId/vehicles', listCustomerVehicles);
router.patch('/customers/:customerId/vehicles/:vehicleId', updateVehicle);
router.patch('/customers/:customerId/vehicles/:vehicleId/activate', activateVehicle);
router.patch('/customers/:customerId/vehicles/:vehicleId/deactivate', deactivateVehicle);
router.delete('/customers/:customerId/vehicles/:vehicleId', deleteVehicle);
router.post(
  '/customers/:customerId/vehicles/:oldVehicleId/replace',
  replaceVehicle,
);
router.post('/customers/:customerId/vehicles/:vehicleId/subscription', createSubscription);
router.get('/customers/:customerId/subscriptions', listSubscriptions);
router.patch('/customers/:customerId/subscriptions/:subscriptionId/rate', changeRate);
router.patch('/customers/:customerId/subscriptions/:subscriptionId/end', endSubscription);
router.get('/customers/:customerId/dues', listDues);
router.post('/customers/:customerId/subscriptions/:subscriptionId/dues', createCurrentDue);

module.exports = router;
