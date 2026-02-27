const express = require('express');
const router = express.Router();
const { checkBreach } = require('../controllers/breachController');

router.post('/check', checkBreach);

module.exports = router;
