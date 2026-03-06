require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

const authRoutes    = require('./routes/auth');
const historyRoutes = require('./routes/history');
const breachRoutes  = require('./routes/breach');
const tipsRoutes    = require('./routes/tips');
const sslRoutes          = require('./routes/ssl');
const convergenceRoutes  = require('./routes/convergence');

const app = express();

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.CLIENT_ORIGIN]
  : ['http://localhost:5173'];

app.use(cors({ origin: allowedOrigins }));
app.use(helmet());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'InfinitySec API running', version: '2.0.0' });
});

app.use('/api/auth',    authRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/breach',  breachRoutes);
app.use('/api/tips',    tipsRoutes);
app.use('/api/ssl',          sslRoutes);
app.use('/api/convergence', convergenceRoutes);

const PORT = process.env.PORT || 5001;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    app.listen(PORT);
  })
  .catch((err) => {
    process.stderr.write(`MongoDB connection error: ${err.message}\n`);
    process.exit(1);
  });
