require('dotenv').config();
const { validateEnv } = require('./lib/env');
validateEnv(); // fail fast on bad config, before anything else touches process.env

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const { connectDB } = require('./lib/db');

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
const phishingRoutes       = require('./routes/phishing');
const supplyChainRoutes    = require('./routes/supplyChain');
const mfaFatigueRoutes     = require('./routes/mfaFatigue');
const scoreRoutes          = require('./routes/score');

require('./jobs/digestCron');
require('./jobs/briefingCron');

const app = express();

// Don't advertise the framework.
app.disable('x-powered-by');

// ─── Trust Railway's reverse proxy ───────────────────────────────────────────
// Required for rate limiters to see real client IPs instead of the proxy IP.
// Without this, all requests appear to come from the same IP and rate limiting
// by IP is completely ineffective.
app.set('trust proxy', 1);

// ─── HTTPS redirect (production) ─────────────────────────────────────────────
// Railway terminates TLS and sets x-forwarded-proto. Redirect any plain HTTP.
// Use the configured origin host, never the client-supplied Host header (spoofable).
const REDIRECT_HOST = (() => {
  try { return new URL(process.env.CLIENT_ORIGIN || '').host || null; } catch { return null; }
})();
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (!req.secure) {
      const host = REDIRECT_HOST || req.headers.host;
      return res.redirect(301, `https://${host}${req.url}`);
    }
    next();
  });
}

// ─── Probe blocking ───────────────────────────────────────────────────────────
// Early 403 for common recon paths and User-Agent-less requests, before routing.
const PROBE = /(^|\/)(\.env|\.git|\.aws|\.ssh|wp-login|wp-admin|wp-content|xmlrpc\.php|phpmyadmin|actuator|server-status|config\.json|\.php)(\/|$)/i;
app.use((req, res, next) => {
  if (req.path === '/api/health') return next();
  if (!req.headers['user-agent'] || PROBE.test(req.path)) {
    return res.status(403).end();
  }
  next();
});

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
  res.json({ message: 'Byronaire Security API running', version: '2.5.1' });
});

// Health check — for Railway / uptime monitors. No auth, no DB write.
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
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
app.use('/api/phishing',        phishingRoutes);
app.use('/api/supply-chain',    supplyChainRoutes);
app.use('/api/mfa-fatigue',     mfaFatigueRoutes);
app.use('/api/score',           scoreRoutes);

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
let server;

connectDB(process.env.MONGODB_URI)
  .then(() => {
    server = app.listen(PORT);
    logger.info('server.start', { port: PORT, env: process.env.NODE_ENV || 'development' });
  })
  .catch(() => {
    process.exit(1); // connectDB already logged the failure after retries
  });

// ─── Graceful shutdown ──────────────────────────────────────────────────────────
// Close the HTTP server (stop accepting new connections) then the DB, so in-flight
// requests finish and Railway gets a clean exit on deploy/restart.
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('server.shutdown', { signal });
  const done = () => mongoose.connection.close(false).then(() => process.exit(0)).catch(() => process.exit(0));
  if (server) server.close(done); else done();
  // Hard cap — never hang a deploy.
  setTimeout(() => process.exit(0), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
