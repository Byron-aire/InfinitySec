require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const logger = require('./utils/logger');

const authRoutes           = require('./routes/auth');
const historyRoutes        = require('./routes/history');
const breachRoutes         = require('./routes/breach');
const tipsRoutes           = require('./routes/tips');
const sslRoutes            = require('./routes/ssl');
const convergenceRoutes    = require('./routes/convergence');
const voidWatchRoutes      = require('./routes/voidWatch');
const newsRoutes           = require('./routes/news');
const sixEyesRoutes        = require('./routes/sixEyes');
const domainStrengthRoutes = require('./routes/domainStrength');
const briefingRoutes       = require('./routes/briefing');

require('./jobs/digestCron');
require('./jobs/briefingCron');

const app = express();

// ─── Trust Railway's reverse proxy ───────────────────────────────────────────
// Required for rate limiters to see real client IPs instead of the proxy IP.
// Without this, all requests appear to come from the same IP and rate limiting
// by IP is completely ineffective.
app.set('trust proxy', 1);

// ─── HTTPS redirect (production) ─────────────────────────────────────────────
// Railway terminates TLS and sets x-forwarded-proto. Redirect any plain HTTP.
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (!req.secure) {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.CLIENT_ORIGIN]
  : ['http://localhost:5173'];

app.use(cors({ origin: allowedOrigins }));

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'none'"],
      frameAncestors: ["'none'"],
      formAction:     ["'none'"],
    },
  },
}));

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));

// ─── Global rate limiter — backstop against scripted abuse ───────────────────
// Individual route limiters are tighter; this catches anything that slips through
// or targets endpoints without a dedicated limiter.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please slow down' },
  handler: (req, res, next, options) => {
    logger.warn('rate_limit.global', {
      ip:   req.ip,
      path: req.path,
      ua:   (req.headers['user-agent'] || '').substring(0, 80),
    });
    res.status(options.statusCode).json(options.message);
  },
});
app.use(globalLimiter);

// ─── Request logging for auth paths ──────────────────────────────────────────
// Log every inbound auth request so failed patterns are visible in Railway logs.
app.use('/api/auth', (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level]('http.auth', {
      method: req.method,
      path:   req.path,
      status: res.statusCode,
      ms:     Date.now() - start,
      ip:     req.ip,
    });
  });
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'InfinitySec API running', version: '2.5.0' });
});

app.use('/api/auth',            authRoutes);
app.use('/api/history',         historyRoutes);
app.use('/api/breach',          breachRoutes);
app.use('/api/tips',            tipsRoutes);
app.use('/api/ssl',             sslRoutes);
app.use('/api/convergence',     convergenceRoutes);
app.use('/api/voidwatch',       voidWatchRoutes);
app.use('/api/news',            newsRoutes);
app.use('/api/six-eyes',        sixEyesRoutes);
app.use('/api/domain-strength', domainStrengthRoutes);
app.use('/api/briefing',        briefingRoutes);

// ─── Global error handler ─────────────────────────────────────────────────────
// Catches any unhandled errors thrown inside route handlers.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error('unhandled_error', {
    method:  req.method,
    path:    req.path,
    ip:      req.ip,
    message: err.message,
  });
  res.status(500).json({ message: 'Server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    app.listen(PORT);
    logger.info('server.start', { port: PORT, env: process.env.NODE_ENV || 'development' });
  })
  .catch((err) => {
    logger.error('db.connect_failed', { message: err.message });
    process.exit(1);
  });
