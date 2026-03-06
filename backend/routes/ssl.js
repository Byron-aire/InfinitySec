const express = require('express');
const rateLimit = require('express-rate-limit');
const { checkSSL } = require('../controllers/sslController');

const router = express.Router();

const sslLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });

router.post('/check', sslLimit, checkSSL);

module.exports = router;
