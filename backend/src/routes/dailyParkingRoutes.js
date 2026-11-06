const express = require('express');
const {
  createEntry,
  getDailyRate,
  listActiveRecords,
  listRecords,
  recordExit,
  recordPayment,
  replaceRateCard,
  updateDailyRate,
} = require('../controllers/dailyParkingController');
const requireAuth = require('../middleware/auth');
const requireParkingMembership = require('../middleware/requireMembership');

const rateRouter = express.Router({ mergeParams: true });
rateRouter.use(requireAuth, requireParkingMembership);
rateRouter.get('/', getDailyRate);
rateRouter.patch('/', updateDailyRate);
// Admin maintenance: replace the whole per-vehicle-type card in one call.
rateRouter.put('/card', replaceRateCard);
rateRouter.patch('/card', replaceRateCard);

const recordsRouter = express.Router({ mergeParams: true });
recordsRouter.use(requireAuth, requireParkingMembership);
recordsRouter.post('/entry', createEntry);
recordsRouter.get('/active', listActiveRecords);
recordsRouter.get('/', listRecords);
recordsRouter.patch('/:recordId/exit', recordExit);
recordsRouter.patch('/:recordId/payment', recordPayment);

module.exports = { rateRouter, recordsRouter };
