const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const parkingRoutes = require('./routes/parkingRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const customerRoutes = require('./routes/customerRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const { rateRouter, recordsRouter } = require('./routes/dailyParkingRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const trustProxyHops = process.env.TRUST_PROXY_HOPS;

if (trustProxyHops) {
  const hopCount = Number(trustProxyHops);
  if (!Number.isSafeInteger(hopCount) || hopCount < 1) {
    throw new Error('TRUST_PROXY_HOPS must be a positive integer');
  }
  app.set('trust proxy', hopCount);
}

const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173', 'http://127.0.0.1:4173'];

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/parkings', parkingRoutes);
app.use('/api/parkings/:parkingId/daily-rate', rateRouter);
app.use('/api/parkings/:parkingId/daily-parking', recordsRouter);
app.use('/api/parkings/:parkingId/dashboard', dashboardRoutes);
app.use('/api/parkings/:parkingId/reports', reportRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/parkings/:parkingId', customerRoutes);
app.use('/api/parkings/:parkingId', paymentRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error('Unhandled request error:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
  });
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
    ? error.status
    : 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred'
    : error.message || 'Internal server error';
  return res.status(status).json({ message });
});

module.exports = app;
