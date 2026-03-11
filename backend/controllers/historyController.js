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

// Whitelist result fields per type — rejects arbitrary injected keys
function sanitizeResult(type, result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return null;
  if (type === 'strength') {
    return {
      ...(typeof result.score    === 'number' && { score:    result.score }),
      ...(typeof result.label    === 'string' && { label:    result.label.slice(0, 50) }),
      ...(typeof result.password === 'string' && { password: result.password.slice(0, 256) }),
      ...(typeof result.name     === 'string' && { name:     result.name.slice(0, 40) }),
    };
  }
  if (type === 'breach') {
    return {
      ...(typeof result.breached === 'boolean' && { breached: result.breached }),
      ...(typeof result.count    === 'number'  && { count:    result.count }),
    };
  }
  if (type === 'generated') {
    const safeOptions = {};
    const OPTION_KEYS = ['upper', 'lower', 'digits', 'symbols'];
    if (result.options && typeof result.options === 'object') {
      for (const k of OPTION_KEYS) {
        if (typeof result.options[k] === 'boolean') safeOptions[k] = result.options[k];
      }
    }
    return {
      ...(typeof result.password === 'string' && { password: result.password.slice(0, 256) }),
      ...(typeof result.length   === 'number' && { length:   result.length }),
      ...(typeof result.name     === 'string' && { name:     result.name.slice(0, 40) }),
      ...(Object.keys(safeOptions).length > 0 && { options: safeOptions }),
    };
  }
  return null;
}

const saveHistory = async (req, res) => {
  try {
    const { type, input, result } = req.body;
    if (!type || !VALID_TYPES.includes(type)) {
      return res.status(400).json({ message: `type must be one of: ${VALID_TYPES.join(', ')}` });
    }
    const safeResult = sanitizeResult(type, result);
    const entry = await PasswordCheck.create({
      userId: req.user._id,
      type,
      input: null, // input is never stored (raw passwords/emails must never be persisted)
      result: safeResult,
    });
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
