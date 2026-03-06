const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getStatus, toggleMonitoring } = require('../controllers/voidWatchController');

router.get('/status', authMiddleware, getStatus);
router.post('/toggle', authMiddleware, toggleMonitoring);

module.exports = router;
