const mongoose = require('mongoose');

const tipSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, enum: ['Passwords', 'Phishing', 'Privacy', 'AI'], required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Tip', tipSchema);
