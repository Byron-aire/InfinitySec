const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const { getHistory, saveHistory, deleteHistory } = require('../controllers/historyController');

const historyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/',      historyLimiter, auth, getHistory);
router.post('/',     historyLimiter, auth, saveHistory);
router.delete('/:id',historyLimiter, auth, deleteHistory);

module.exports = router;
