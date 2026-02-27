const express = require('express');
const router = express.Router();
const { getTips, getTipById } = require('../controllers/tipsController');

router.get('/', getTips);
router.get('/:id', getTipById);

module.exports = router;
