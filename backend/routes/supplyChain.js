const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');
const { scan } = require('../controllers/supplyChainController');

const supplyChainLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { message: 'Too many supply chain scan requests — please wait before submitting more' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/scan', supplyChainLimiter, authMiddleware, scan);

module.exports = router;
