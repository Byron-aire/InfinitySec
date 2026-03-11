const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { getTips, getTipById } = require('../controllers/tipsController');

const tipsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: { message: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/',    tipsLimiter, getTips);
router.get('/:id', tipsLimiter, getTipById);

module.exports = router;
