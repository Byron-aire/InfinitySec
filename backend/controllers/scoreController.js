const { computeScore } = require('../lib/securityScore');
const ScoreSnapshot = require('../models/ScoreSnapshot');
const logger = require('../utils/logger');

const SNAPSHOT_MIN_GAP_MS = 12 * 60 * 60 * 1000; // don't snapshot more than ~twice a day unless the score moves

async function getScore(req, res) {
  try {
    const result = await computeScore(req.user);

    // Trend: most recent snapshots (oldest→newest for charting).
    const recent = await ScoreSnapshot.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    const last = recent[0] || null;

    // Snapshot when the score changed, or enough time has passed — keeps the
    // trend line meaningful without flooding the collection on every page load.
    const changed = !last || last.score !== result.score;
    const stale = last && (Date.now() - new Date(last.createdAt).getTime()) > SNAPSHOT_MIN_GAP_MS;
    if (changed || stale) {
      await ScoreSnapshot.create({ userId: req.user._id, score: result.score, grade: result.grade });
      recent.unshift({ score: result.score, grade: result.grade, createdAt: new Date() });
    }

    const trend = recent
      .slice(0, 30)
      .reverse()
      .map(s => ({ score: s.score, at: s.createdAt }));

    const best = Math.max(result.score, ...recent.map(s => s.score));
    const previous = last ? last.score : null;
    const milestones = {
      best,
      delta: previous === null ? null : result.score - previous,
      allGreen: result.factors.every(f => f.earned),
      reached50: best >= 50,
      reached90: best >= 90,
    };

    res.json({ ...result, trend, milestones });
  } catch (err) {
    logger.error('score.get.error', { message: err.message });
    res.status(500).json({ message: 'Could not compute your security score.' });
  }
}

module.exports = { getScore };
