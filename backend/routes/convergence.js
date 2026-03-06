const express = require('express');
const rateLimit = require('express-rate-limit');
const { checkURL } = require('../controllers/convergenceController');

const router = express.Router();

const convergenceLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 50, standardHeaders: true, legacyHeaders: false });

router.post('/check', convergenceLimit, checkURL);

module.exports = router;
