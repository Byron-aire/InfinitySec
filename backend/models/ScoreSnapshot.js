const mongoose = require('mongoose');

// A point-in-time record of a user's security score, for the "watch it climb"
// trend line and before/after deltas. One row per meaningful change (see
// scoreController — we only snapshot when the score moves or a day has passed).
const scoreSnapshotSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  score:     { type: Number, required: true },
  grade:     { type: String },
  createdAt: { type: Date, default: Date.now },
});

scoreSnapshotSchema.index({ userId: 1, createdAt: 1 });

module.exports = mongoose.model('ScoreSnapshot', scoreSnapshotSchema);
