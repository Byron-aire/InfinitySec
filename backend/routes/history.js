const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getHistory, saveHistory, deleteHistory } = require('../controllers/historyController');

router.get('/', auth, getHistory);
router.post('/', auth, saveHistory);
router.delete('/:id', auth, deleteHistory);

module.exports = router;
