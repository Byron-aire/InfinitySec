const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { register, login, deleteAccount } = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many attempts, please try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, register);
router.post('/login',    authLimiter, login);
router.delete('/account', authMiddleware, deleteAccount);

module.exports = router;
