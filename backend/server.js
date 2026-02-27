require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const historyRoutes = require('./routes/history');
const breachRoutes = require('./routes/breach');
const tipsRoutes = require('./routes/tips');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'SecureCheck API running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/breach', breachRoutes);
app.use('/api/tips', tipsRoutes);

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
