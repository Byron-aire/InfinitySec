const User = require('../models/User');
const PasswordCheck = require('../models/PasswordCheck');
const jwt = require('jsonwebtoken');
const { sendMail } = require('../utils/mailer');

const generateToken = (user) =>
  jwt.sign(
    { _id: user._id, username: user.username, email: user.email, tokenVersion: user.tokenVersion },
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
    const token = generateToken(user);
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
    user.sessions.push({ ip, userAgent });
    if (user.sessions.length > 10) user.sessions = user.sessions.slice(-10);
    await user.save();
    if (isNewIP) {
      sendMail({
        to: user.email,
        subject: 'New sign-in to InfinitySec',
        text: [
          `A new sign-in was detected on your InfinitySec account.`,
          ``,
          `IP address: ${ip}`,
          `Browser:    ${userAgent.substring(0, 100)}`,
          `Time:       ${new Date().toUTCString()}`,
          ``,
          `If this wasn't you, go to /sessions and click "Sign out everywhere" immediately.`,
          ``,
          `— InfinitySec`,
        ].join('\n'),
      }).catch(() => {});
    }
    const token = generateToken(user);
    res.json({ token, user: { _id: user._id, username: user.username, email: user.email } });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const getSessions = async (req, res) => {
  try {
    res.json({ sessions: req.user.sessions || [] });
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
    await PasswordCheck.deleteMany({ userId: req.user._id });
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: 'Account deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const exportData = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const history = await PasswordCheck.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({
      exportedAt: new Date().toISOString(),
      account: {
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
      history,
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
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, login, deleteAccount, exportData, getSessions, logoutAll, getAccountSummary };
