const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const parkingRoutes = require('./routes/parkingRoutes');
const invitationRoutes = require('./routes/invitationRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/parkings', parkingRoutes);
app.use('/api/invitations', invitationRoutes);

module.exports = app;
