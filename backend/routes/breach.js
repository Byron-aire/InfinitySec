const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { checkBreach } = require('../controllers/breachController');

const breachLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { message: 'Too many breach checks, please try again in an hour' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/check', breachLimiter, checkBreach);

module.exports = router;
