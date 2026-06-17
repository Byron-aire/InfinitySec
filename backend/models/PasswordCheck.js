const mongoose = require('mongoose');

const passwordCheckSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['strength', 'breach', 'generated'], required: true },
  input: { type: String, default: null },
  result: { type: Object },
  createdAt: { type: Date, default: Date.now },
});

// History is always queried per user, often filtered by type (and sorted newest-first).
passwordCheckSchema.index({ userId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('PasswordCheck', passwordCheckSchema);
