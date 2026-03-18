const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const authMiddleware = require('../middleware/auth');
const { analyse } = require('../controllers/phishingController');

const phishingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { message: 'Too many phishing analysis requests — please wait before submitting more' },
  standardHeaders: true,
  legacyHeaders: false,
});

// In-memory storage — file never touches disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB hard limit at multer level
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.post(
  '/analyse',
  phishingLimiter,
  authMiddleware,
  upload.single('image'),  // optional — field name 'image'
  analyse
);

module.exports = router;
