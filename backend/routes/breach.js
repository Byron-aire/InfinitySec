const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');
const { checkBreach } = require('../controllers/breachController');
const { analyse } = require('../controllers/cursedIntelController');

const breachLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { message: 'Too many breach checks, please try again in an hour' },
  standardHeaders: true,
  legacyHeaders: false,
});

const impactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { message: 'Too many AI analysis requests — please wait before trying again' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/check',  breachLimiter, checkBreach);
router.post('/impact', impactLimiter, authMiddleware, analyse);

module.exports = router;
