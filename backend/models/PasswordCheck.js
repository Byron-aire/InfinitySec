const mongoose = require('mongoose');

const passwordCheckSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['strength', 'breach', 'generated'], required: true },
  input: { type: String, default: null },
  result: { type: Object },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('PasswordCheck', passwordCheckSchema);
