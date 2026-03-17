const express = require('express');
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');
const { checkURL } = require('../controllers/convergenceController');

const router = express.Router();

const convergenceLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many URL scans — please wait before scanning more' },
});

// Auth required — uses an external paid API (Google Safe Browsing) and must be user-scoped
router.post('/check', convergenceLimit, authMiddleware, checkURL);

module.exports = router;
