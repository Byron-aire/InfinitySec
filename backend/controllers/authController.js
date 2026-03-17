const User = require('../models/User');
const PasswordCheck = require('../models/PasswordCheck');
const AuditLog = require('../models/AuditLog');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { randomUUID, randomBytes, createHash } = require('crypto');
const { sendMail } = require('../utils/mailer');
const claude = require('../utils/claudeClient');
const logger = require('../utils/logger');

const CHAT_MODEL = process.env.CLAUDE_CHAT_MODEL || 'claude-haiku-4-5-20251001';

// Used for constant-time comparison when the user is not found
// Prevents timing attacks that reveal whether an email is registered
const DUMMY_HASH = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

// JWT payload carries only what the auth middleware needs.
// Email/username are NOT included — middleware fetches the full user from DB anyway.
const generateToken = (user, jti) =>
  jwt.sign(
    { _id: user._id, tokenVersion: user.tokenVersion, jti },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

// Generate a raw token (sent in email) and its SHA-256 hash (stored in DB)
function generateSecureToken() {
  const raw = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

// Enforce password policy server-side (mirrors the client-side strength checker)
function validatePasswordPolicy(password) {
  if (!password || password.length < 8)  return 'Password must be at least 8 characters';
  if (password.length > 72)              return 'Password must be 72 characters or fewer';
  if (!/[a-z]/.test(password))           return 'Password must contain a lowercase letter';
  if (!/[A-Z]/.test(password))           return 'Password must contain an uppercase letter';
  if (!/\d/.test(password))              return 'Password must contain at least one number';
  return null; // null = passes
}

// Sessions older than 7 days have expired JWTs — remove them on login
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Build the verification/reset email link
function appUrl(path) {
  const base = (process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
  return `${base}${path}`;
}

// ─── Email helpers ────────────────────────────────────────────────────────────

async function sendVerificationEmail(user, rawToken) {
  const link = appUrl(`/verify-email?token=${rawToken}`);
  await sendMail({
    to:      user.email,
    subject: 'Verify your InfinitySec email',
    text: [
      `Hi ${user.username},`,
      '',
      'Please verify your email address to activate your InfinitySec account.',
      '',
      `Verification link: ${link}`,
      '',
      'This link expires in 24 hours.',
      '',
      'If you did not create an account, you can safely ignore this email.',
      '',
      '— InfinitySec',
    ].join('\n'),
  });
}

async function sendPasswordResetEmail(user, rawToken) {
  const link = appUrl(`/reset-password?token=${rawToken}`);
  await sendMail({
    to:      user.email,
    subject: 'Reset your InfinitySec password',
    text: [
      `Hi ${user.username},`,
      '',
      'A password reset was requested for your InfinitySec account.',
      '',
      `Reset link: ${link}`,
      '',
      'This link expires in 1 hour. If you did not request a reset, you can safely ignore this email.',
      '',
      '— InfinitySec',
    ].join('\n'),
  });
}

// ─── AI anomaly detection (fire-and-forget after login) ──────────────────────

async function detectAndAlert(user, { ip, userAgent }) {
  const priorSessions = (user.sessions || [])
    .slice(0, -1)
    .slice(-9)
    .reverse();

  const basicEmail = () => sendMail({
    to:      user.email,
    subject: 'New sign-in to InfinitySec',
    text: [
      'A new sign-in was detected on your InfinitySec account.',
      '',
      `IP address: ${ip}`,
      `Browser:    ${userAgent.substring(0, 100)}`,
      `Time:       ${new Date().toUTCString()}`,
      '',
      'If this wasn\'t you, go to /sessions and click "Sign out everywhere" immediately.',
      '',
      '— InfinitySec',
    ].join('\n'),
  });

  if (!user.aiConsent?.accepted || !process.env.ANTHROPIC_API_KEY || priorSessions.length === 0) {
    await basicEmail();
    return;
  }

  let anomalyResult;
  try {
    const sessionLines = priorSessions.map((s, i) =>
      `${i + 1}. IP: ${s.ip} | Device: ${(s.userAgent || '').substring(0, 80)} | ${new Date(s.createdAt).toUTCString()}`
    ).join('\n');

    const prompt = `You are a login security analyser for InfinitySec.

A user just signed in from a new IP address. Analyse whether this login appears anomalous based on their session history.

New login:
- IP: ${ip}
- Device: ${userAgent.substring(0, 120)}
- Time (UTC): ${new Date().toUTCString()}

Previous sessions (most recent first):
${sessionLines}

Be conservative — only flag as anomalous if there is a concrete, observable reason such as a dramatically different device type, a login at an unusual hour compared to established patterns, or a very different location suggested by IP context. Do not flag first-time logins or normal IP changes. IPs alone are rarely conclusive.

Respond with ONLY valid JSON (no markdown fences):
{ "anomalous": <bool>, "confidence": <"low"|"medium"|"high">, "reasoning": <1-2 sentences> }`;

    const msg = await claude.messages.create({
      model:      CHAT_MODEL,
      max_tokens: 200,
      messages:   [{ role: 'user', content: prompt }],
    });

    const raw = msg.content[0]?.text?.trim() || '';
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    anomalyResult = JSON.parse(jsonStr);
  } catch {
    await basicEmail();
    return;
  }

  if (anomalyResult.anomalous && anomalyResult.confidence !== 'low') {
    await sendMail({
      to:      user.email,
      subject: 'Suspicious sign-in detected — InfinitySec',
      text: [
        'A potentially suspicious sign-in was detected on your InfinitySec account.',
        '',
        `IP address: ${ip}`,
        `Browser:    ${userAgent.substring(0, 100)}`,
        `Time:       ${new Date().toUTCString()}`,
        '',
        `AI assessment (${anomalyResult.confidence} confidence): ${anomalyResult.reasoning}`,
        '',
        'If this wasn\'t you, go to /sessions and click "Sign out everywhere" immediately.',
        '',
        '— InfinitySec (AI-assisted alert · Claude Haiku · May be inaccurate)',
      ].join('\n'),
    });
  } else {
    await basicEmail();
  }
}

// ─── Controllers ─────────────────────────────────────────────────────────────

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Username: 3–30 chars, alphanumeric / underscore / hyphen only
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
      return res.status(400).json({ message: 'Username must be 3–30 characters (letters, numbers, _ or -)' });
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }

    // Server-side password policy
    const policyError = validatePasswordPolicy(password);
    if (policyError) return res.status(400).json({ message: policyError });

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(400).json({ message: 'Username or email already in use' });
    }

    const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER);

    if (smtpConfigured) {
      // Require email verification before first login
      const { raw, hash } = generateSecureToken();
      const user = await User.create({
        username,
        email,
        password,
        emailVerified:            false,
        emailVerificationToken:   hash,
        emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      });
      await sendVerificationEmail(user, raw);
      return res.status(201).json({ message: 'Account created. Check your email to verify your address before signing in.' });
    }

    // SMTP not configured — auto-verify so the app stays usable in dev/no-email setups
    const user = await User.create({ username, email, password, emailVerified: true });
    const jti = randomUUID();
    const ip = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    user.sessions.push({ jti, ip, userAgent });
    await user.save();
    logger.info('auth.register', { ip });
    const token = generateToken(user, jti);
    return res.status(201).json({ token, user: { _id: user._id, username: user.username, email: user.email } });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });

    // Always run bcrypt — prevents timing attacks that reveal whether an email is registered
    const isMatch = user
      ? await user.comparePassword(password)
      : await bcrypt.compare(password, DUMMY_HASH);

    // Check account lockout BEFORE revealing credential result
    if (user?.isLocked) {
      logger.warn('auth.login_blocked', { reason: 'account_locked', ip: req.ip });
      return res.status(403).json({
        message: 'Account temporarily locked due to too many failed sign-in attempts. Try again in 15 minutes.',
        code: 'ACCOUNT_LOCKED',
      });
    }

    if (!user || !isMatch) {
      if (user) await user.incLoginAttempts();
      logger.warn('auth.login_failure', { reason: 'invalid_credentials', ip: req.ip });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.emailVerified) {
      logger.warn('auth.login_blocked', { reason: 'email_not_verified', ip: req.ip });
      return res.status(403).json({
        message: 'Please verify your email before signing in.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    // Successful auth — reset lockout state
    if (user.loginAttempts > 0 || user.lockUntil) {
      await user.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
    }

    const ip = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const isNewIP = user.sessions.length > 0 && user.sessions.every(s => s.ip !== ip);

    // Remove sessions whose JWTs have already expired (older than 7 days)
    user.sessions = user.sessions.filter(
      s => Date.now() - new Date(s.createdAt).getTime() < SESSION_TTL_MS
    );

    const jti = randomUUID();
    user.sessions.push({ jti, ip, userAgent });
    if (user.sessions.length > 10) user.sessions = user.sessions.slice(-10);
    await user.save();

    logger.info('auth.login_success', { ip: req.ip });
    const token = generateToken(user, jti);
    res.json({ token, user: { _id: user._id, username: user.username, email: user.email } });

    // Fire-and-forget after response — never blocks login
    if (isNewIP) {
      detectAndAlert(user, { ip, userAgent }).catch(() => {});
    }
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: 'Verification token is required' });

    const hash = createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      emailVerificationToken:   hash,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Verification link is invalid or has expired. Request a new one.' });
    }

    user.emailVerified            = true;
    user.emailVerificationToken   = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified. You can now sign in.' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    // Always return the same response — prevents email enumeration
    const user = await User.findOne({ email });
    if (user && !user.emailVerified) {
      const { raw, hash } = generateSecureToken();
      user.emailVerificationToken   = hash;
      user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
      await user.save();
      await sendVerificationEmail(user, raw).catch(() => {});
    }

    res.json({ message: 'If that address is registered and unverified, a new link has been sent.' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    // Always return the same response — prevents email enumeration
    const user = await User.findOne({ email });
    if (user && user.emailVerified) {
      const { raw, hash } = generateSecureToken();
      user.passwordResetToken   = hash;
      user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
      await user.save();
      await sendPasswordResetEmail(user, raw).catch(() => {});
    }

    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    const policyError = validatePasswordPolicy(password);
    if (policyError) return res.status(400).json({ message: policyError });

    const hash = createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken:   hash,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired. Request a new one.' });
    }

    user.password             = password; // pre-save hook hashes it
    user.passwordResetToken   = undefined;
    user.passwordResetExpires = undefined;
    // Invalidate all active sessions — forces re-login on all devices
    user.tokenVersion        += 1;
    user.sessions             = [];
    user.loginAttempts        = 0;
    user.lockUntil            = undefined;
    await user.save();

    logger.info('auth.password_reset', { ip: req.ip });
    res.json({ message: 'Password reset successfully. Please sign in with your new password.' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const getSessions = async (req, res) => {
  try {
    res.json({ sessions: req.user.sessions || [], currentJti: req.jti });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const revokeSession = async (req, res) => {
  try {
    const { jti } = req.params;
    if (!jti) return res.status(400).json({ message: 'Session ID required' });
    await User.findByIdAndUpdate(req.user._id, { $pull: { sessions: { jti } } });
    res.json({ message: 'Session revoked' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const logoutAll = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { tokenVersion: 1 },
      $set: { sessions: [] },
    });
    res.json({ message: 'All sessions revoked' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: 'Password confirmation is required to delete your account' });
    }

    // Re-fetch with password field (middleware selects -password)
    const user = await User.findById(req.user._id);
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    await Promise.all([
      PasswordCheck.deleteMany({ userId: req.user._id }),
      AuditLog.deleteMany({ userId: req.user._id }),
    ]);
    await User.findByIdAndDelete(req.user._id);
    logger.info('auth.account_delete', { ip: req.ip });
    res.json({ message: 'Account deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const exportData = async (req, res) => {
  try {
    const [user, history, aiLog] = await Promise.all([
      User.findById(req.user._id).select('-password'),
      PasswordCheck.find({ userId: req.user._id }).sort({ createdAt: -1 }),
      AuditLog.find({ userId: req.user._id }).sort({ createdAt: -1 }).select('-userId'),
    ]);
    res.json({
      exportedAt: new Date().toISOString(),
      account: {
        username:  user.username,
        email:     user.email,
        createdAt: user.createdAt,
        aiConsent: user.aiConsent,
        passkeys:  (user.passkeys || []).map(pk => ({ deviceName: pk.deviceName, registeredAt: pk.registeredAt })),
      },
      history,
      aiAuditLog: aiLog,
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const getAccountSummary = async (req, res) => {
  try {
    const [strengthCount, breachCount, generatedCount] = await Promise.all([
      PasswordCheck.countDocuments({ userId: req.user._id, type: 'strength' }),
      PasswordCheck.countDocuments({ userId: req.user._id, type: 'breach' }),
      PasswordCheck.countDocuments({ userId: req.user._id, type: 'generated' }),
    ]);
    const sessions = req.user.sessions || [];
    res.json({
      account: {
        username:  req.user.username,
        email:     req.user.email,
        createdAt: req.user.createdAt,
      },
      history: {
        total:     strengthCount + breachCount + generatedCount,
        strength:  strengthCount,
        breach:    breachCount,
        generated: generatedCount,
      },
      sessions: {
        count:     sessions.length,
        lastLogin: sessions.length > 0 ? sessions[sessions.length - 1].createdAt : null,
      },
      monitoring: {
        enabled:      req.user.monitoring.enabled,
        subscribedAt: req.user.monitoring.subscribedAt,
      },
      aiConsent: {
        accepted:   req.user.aiConsent?.accepted || false,
        acceptedAt: req.user.aiConsent?.acceptedAt || null,
      },
      briefingEnabled: req.user.briefingEnabled || false,
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  deleteAccount,
  exportData,
  getSessions,
  revokeSession,
  logoutAll,
  getAccountSummary,
};
