const express = require('express');
const {
  createEntry,
  getDailyRate,
  listActiveRecords,
  listRecords,
  recordExit,
  recordPayment,
  updateDailyRate,
} = require('../controllers/dailyParkingController');
const requireAuth = require('../middleware/auth');
const requireParkingMembership = require('../middleware/requireMembership');

const rateRouter = express.Router({ mergeParams: true });
rateRouter.use(requireAuth, requireParkingMembership);
rateRouter.get('/', getDailyRate);
rateRouter.patch('/', updateDailyRate);

const recordsRouter = express.Router({ mergeParams: true });
recordsRouter.use(requireAuth, requireParkingMembership);
recordsRouter.post('/entry', createEntry);
recordsRouter.get('/active', listActiveRecords);
recordsRouter.get('/', listRecords);
recordsRouter.patch('/:recordId/exit', recordExit);
recordsRouter.patch('/:recordId/payment', recordPayment);

module.exports = { rateRouter, recordsRouter };
