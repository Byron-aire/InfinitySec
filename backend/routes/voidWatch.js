const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');
const { getStatus, toggleMonitoring } = require('../controllers/voidWatchController');

const voidWatchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/status', authMiddleware, getStatus);
router.post('/toggle', voidWatchLimiter, authMiddleware, toggleMonitoring);

module.exports = router;
