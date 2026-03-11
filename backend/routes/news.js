const express = require('express');
const rateLimit = require('express-rate-limit');
const { getNews } = require('../controllers/newsController');

const router = express.Router();

const newsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/', newsLimiter, getNews);

module.exports = router;
