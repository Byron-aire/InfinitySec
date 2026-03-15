const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');
const { getStatus, toggleBriefing } = require('../controllers/briefingController');

const toggleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many requests — please wait before trying again' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/status', authMiddleware, getStatus);
router.post('/toggle', toggleLimiter, authMiddleware, toggleBriefing);

module.exports = router;
