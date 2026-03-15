const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');
const { analyse } = require('../controllers/domainStrengthController');

const analyseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { message: 'Too many domain analysis requests — please wait before scanning more' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/check', analyseLimiter, authMiddleware, analyse);

module.exports = router;
