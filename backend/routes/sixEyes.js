const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');
const { giveConsent, withdrawConsent, chat, getLog } = require('../controllers/sixEyesController');

const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15,
  message: { message: 'Too many AI requests — please wait before sending more' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/consent',    authMiddleware, giveConsent);
router.delete('/consent',  authMiddleware, withdrawConsent);
router.post('/chat',       chatLimiter, authMiddleware, chat);
router.get('/log',         authMiddleware, getLog);

module.exports = router;
