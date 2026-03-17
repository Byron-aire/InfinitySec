const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

const sessionSchema = new mongoose.Schema({
  jti:       { type: String, required: true },
  ip:        { type: String, default: 'unknown' },
  userAgent: { type: String, default: 'unknown' },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const userSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
  email:        { type: String, required: true, unique: true, lowercase: true },
  password:     { type: String, required: true, minlength: 8 },
  createdAt:    { type: Date, default: Date.now },
  tokenVersion: { type: Number, default: 0 },
  sessions:     { type: [sessionSchema], default: [] },

  // Email verification
  emailVerified:            { type: Boolean, default: false },
  emailVerificationToken:   { type: String },    // SHA-256 hash of the raw token
  emailVerificationExpires: { type: Date },

  // Password reset
  passwordResetToken:   { type: String },         // SHA-256 hash of the raw token
  passwordResetExpires: { type: Date },

  // Account lockout
  loginAttempts: { type: Number, default: 0 },
  lockUntil:     { type: Date },

  monitoring: {
    enabled:      { type: Boolean, default: false },
    subscribedAt: { type: Date },
  },
  aiConsent: {
    accepted:   { type: Boolean, default: false },
    acceptedAt: { type: Date },
  },
  briefingEnabled: { type: Boolean, default: false },
});

// Virtual: is the account currently locked?
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Increment failed login attempts; lock account after MAX_LOGIN_ATTEMPTS
userSchema.methods.incLoginAttempts = async function () {
  // If a previous lock has expired, restart the counter
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set:   { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }
  return this.updateOne(updates);
};

module.exports = mongoose.model('User', userSchema);
