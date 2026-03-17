const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const {
  register,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  deleteAccount,
  exportData,
  getSessions,
  revokeSession,
  logoutAll,
  getAccountSummary,
} = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Registration + login: 20 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again in 15 minutes' },
  handler: (req, res, next, options) => {
    logger.warn('rate_limit.auth', {
      ip:   req.ip,
      path: req.path,
      ua:   (req.headers['user-agent'] || '').substring(0, 80),
    });
    res.status(options.statusCode).json(options.message);
  },
});

// Email-sending endpoints: 5 per hour per IP
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again in an hour' },
  handler: (req, res, next, options) => {
    logger.warn('rate_limit.email', { ip: req.ip, path: req.path });
    res.status(options.statusCode).json(options.message);
  },
});

router.post('/register',            authLimiter,  register);
router.post('/login',               authLimiter,  login);
router.get('/verify-email',                       verifyEmail);
router.post('/resend-verification', emailLimiter, resendVerification);
router.post('/forgot-password',     emailLimiter, forgotPassword);
router.post('/reset-password',      authLimiter,  resetPassword);

router.delete('/account',           authMiddleware, deleteAccount);
router.get('/export',               authMiddleware, exportData);
router.get('/sessions',             authMiddleware, getSessions);
router.delete('/sessions/:jti',     authMiddleware, revokeSession);
router.delete('/sessions',          authMiddleware, logoutAll);
router.get('/account-summary',      authMiddleware, getAccountSummary);

module.exports = router;
