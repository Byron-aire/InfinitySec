const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');
const { analyse, quickScan } = require('../controllers/domainStrengthController');

// Deep scan calls Claude — tight AI budget
const analyseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { message: 'Too many domain analysis requests — please wait before scanning more' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Quick scan is deterministic (no AI) — more generous budget
const quickLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: { message: 'Too many quick scans — please wait before scanning more' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/quick', quickLimiter, authMiddleware, quickScan);
router.post('/check', analyseLimiter, authMiddleware, analyse);

module.exports = router;
