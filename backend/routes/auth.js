const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
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
  message: { message: 'Too many attempts, please try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Email-sending endpoints: 5 per hour per IP (verification + password reset)
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: 'Too many requests, please try again in an hour' },
  standardHeaders: true,
  legacyHeaders: false,
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
