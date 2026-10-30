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

module.exports = router;
