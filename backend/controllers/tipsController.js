const mongoose = require('mongoose');
const Tip = require('../models/Tip');

const getTips = async (req, res) => {
  try {
    const filter = req.query.category ? { category: req.query.category } : {};
    const tips = await Tip.find(filter).sort({ createdAt: 1 });
    res.json(tips);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const getTipById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }
    const tip = await Tip.findById(req.params.id);
    if (!tip) return res.status(404).json({ message: 'Tip not found' });
    res.json(tip);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getTips, getTipById };
