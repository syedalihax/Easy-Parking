require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

connectDB().then(() => {
  app.listen(PORT, HOST, () => {
    console.log(`easyParking backend listening on ${HOST}:${PORT}`);
  });
});
