const mongoose = require('mongoose');
const PasswordCheck = require('../models/PasswordCheck');

const getHistory = async (req, res) => {
  try {
    const history = await PasswordCheck.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(history);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const VALID_TYPES = ['strength', 'breach', 'generated'];

const saveHistory = async (req, res) => {
  try {
    const { type, input, result } = req.body;
    if (!type || !VALID_TYPES.includes(type)) {
      return res.status(400).json({ message: `type must be one of: ${VALID_TYPES.join(', ')}` });
    }
    const entry = await PasswordCheck.create({ userId: req.user._id, type, input, result });
    res.status(201).json(entry);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteHistory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }
    const entry = await PasswordCheck.findById(id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    if (entry.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorised' });
    }
    await entry.deleteOne();
    res.json({ message: 'Deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getHistory, saveHistory, deleteHistory };
