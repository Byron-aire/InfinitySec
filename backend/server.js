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
const voidWatchRoutes    = require('./routes/voidWatch');
const newsRoutes         = require('./routes/news');
const sixEyesRoutes          = require('./routes/sixEyes');
const domainStrengthRoutes   = require('./routes/domainStrength');
const briefingRoutes         = require('./routes/briefing');

require('./jobs/digestCron');
require('./jobs/briefingCron');

const app = express();

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.CLIENT_ORIGIN]
  : ['http://localhost:5173'];

app.use(cors({ origin: allowedOrigins }));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'none'"],
      frameAncestors: ["'none'"],
      formAction:     ["'none'"],
    },
  },
}));
app.use(express.json({ limit: '10kb' }));

app.get('/', (req, res) => {
  res.json({ message: 'InfinitySec API running', version: '2.5.0' });
});

app.use('/api/auth',    authRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/breach',  breachRoutes);
app.use('/api/tips',    tipsRoutes);
app.use('/api/ssl',          sslRoutes);
app.use('/api/convergence', convergenceRoutes);
app.use('/api/voidwatch',   voidWatchRoutes);
app.use('/api/news',        newsRoutes);
app.use('/api/six-eyes',        sixEyesRoutes);
app.use('/api/domain-strength', domainStrengthRoutes);
app.use('/api/briefing',        briefingRoutes);

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
