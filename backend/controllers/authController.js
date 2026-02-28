const User = require('../models/User');
const PasswordCheck = require('../models/PasswordCheck');
const jwt = require('jsonwebtoken');

const generateToken = (user) =>
  jwt.sign(
    { _id: user._id, username: user.username, email: user.email },
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
    const token = generateToken(user);
    res.json({ token, user: { _id: user._id, username: user.username, email: user.email } });
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

module.exports = { register, login, deleteAccount, exportData };
