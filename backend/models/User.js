const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const sessionSchema = new mongoose.Schema({
  jti:       { type: String, required: true },
  ip:        { type: String, default: 'unknown' },
  userAgent: { type: String, default: 'unknown' },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const userSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true },
  password:     { type: String, required: true, minlength: 6 },
  createdAt:    { type: Date, default: Date.now },
  tokenVersion: { type: Number, default: 0 },
  sessions:     { type: [sessionSchema], default: [] },
  monitoring:   {
    enabled:      { type: Boolean, default: false },
    subscribedAt: { type: Date },
  },
  aiConsent: {
    accepted:   { type: Boolean, default: false },
    acceptedAt: { type: Date },
  },
  briefingEnabled: { type: Boolean, default: false },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
