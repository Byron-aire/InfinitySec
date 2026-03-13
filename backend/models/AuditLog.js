const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  feature:      { type: String, enum: ['six-eyes', 'domain-strength', 'breach-impact', 'briefing'], required: true },
  promptHash:   { type: String, required: true }, // SHA-256 of prompt — never plaintext
  model:        { type: String, required: true },
  inputTokens:  { type: Number, default: 0 },
  outputTokens: { type: Number, default: 0 },
  success:      { type: Boolean, default: true },
  createdAt:    { type: Date, default: Date.now },
});

auditLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
