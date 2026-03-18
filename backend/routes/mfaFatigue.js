const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');
const { check } = require('../controllers/mfaFatigueController');

const mfaFatigueLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { message: 'Too many MFA analysis requests — please wait before submitting more' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/check', mfaFatigueLimiter, authMiddleware, check);

module.exports = router;
