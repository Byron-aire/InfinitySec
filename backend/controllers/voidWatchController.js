const User = require('../models/User');

const getStatus = async (req, res) => {
  try {
    const { monitoring, email } = req.user;
    res.json({ enabled: monitoring.enabled, subscribedAt: monitoring.subscribedAt, email });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const toggleMonitoring = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.monitoring.enabled = !user.monitoring.enabled;
    if (user.monitoring.enabled) user.monitoring.subscribedAt = new Date();
    await user.save();
    res.json({ enabled: user.monitoring.enabled, subscribedAt: user.monitoring.subscribedAt });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getStatus, toggleMonitoring };
