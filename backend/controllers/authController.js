const User = require('../models/User');
const PasswordCheck = require('../models/PasswordCheck');
const AuditLog = require('../models/AuditLog');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const { sendMail } = require('../utils/mailer');
const claude = require('../utils/claudeClient');

const CHAT_MODEL = process.env.CLAUDE_CHAT_MODEL || 'claude-haiku-4-5-20251001';

// Fire-and-forget: analyse login sessions for anomalies, send appropriate alert
async function detectAndAlert(user, { ip, userAgent }) {
  const priorSessions = (user.sessions || [])
    .slice(0, -1) // exclude the session we just added
    .slice(-9)
    .reverse(); // most recent first

  const basicEmail = () => sendMail({
    to: user.email,
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

  // If no AI consent or no key, send plain email and return
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
      model: CHAT_MODEL,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = msg.content[0]?.text?.trim() || '';
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    anomalyResult = JSON.parse(jsonStr);
  } catch {
    // Claude failed — fall back to basic email
    await basicEmail();
    return;
  }

  if (anomalyResult.anomalous && anomalyResult.confidence !== 'low') {
    await sendMail({
      to: user.email,
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

const generateToken = (user, jti) =>
  jwt.sign(
    { _id: user._id, username: user.username, email: user.email, tokenVersion: user.tokenVersion, jti },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(400).json({ message: 'Username or email already in use' });
    }
    const user = await User.create({ username, email, password });
    const jti = randomUUID();
    const ip = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    user.sessions.push({ jti, ip, userAgent });
    await user.save();
    const token = generateToken(user, jti);
    res.status(201).json({ token, user: { _id: user._id, username: user.username, email: user.email } });
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
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const ip = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const isNewIP = user.sessions.length > 0 && user.sessions.every(s => s.ip !== ip);
    const jti = randomUUID();
    user.sessions.push({ jti, ip, userAgent });
    if (user.sessions.length > 10) user.sessions = user.sessions.slice(-10);
    await user.save();
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
    // Prevent revoking your own current session via this endpoint — use logoutAll or client logout
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { sessions: { jti } },
    });
    res.json({ message: 'Session revoked' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const logoutAll = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { tokenVersion: 1 },
      $set:  { sessions: [] },
    });
    res.json({ message: 'All sessions revoked' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteAccount = async (req, res) => {
  try {
    await Promise.all([
      PasswordCheck.deleteMany({ userId: req.user._id }),
      AuditLog.deleteMany({ userId: req.user._id }),
    ]);
    await User.findByIdAndDelete(req.user._id);
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

module.exports = { register, login, deleteAccount, exportData, getSessions, revokeSession, logoutAll, getAccountSummary };
