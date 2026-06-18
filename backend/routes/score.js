const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getScore } = require('../controllers/scoreController');

router.get('/', authMiddleware, getScore);

module.exports = router;
