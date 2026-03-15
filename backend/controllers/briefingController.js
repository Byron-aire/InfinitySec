const User = require('../models/User');

const getStatus = async (req, res) => {
  try {
    res.json({
      enabled:   req.user.briefingEnabled || false,
      aiConsent: req.user.aiConsent?.accepted || false,
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const toggleBriefing = async (req, res) => {
  try {
    if (!req.user.aiConsent?.accepted) {
      return res.status(403).json({ message: 'AI consent required to enable The Briefing' });
    }
    const user = await User.findById(req.user._id);
    user.briefingEnabled = !user.briefingEnabled;
    await user.save();
    res.json({ enabled: user.briefingEnabled });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getStatus, toggleBriefing };
