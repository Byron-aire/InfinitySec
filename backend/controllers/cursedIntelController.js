const { createHash } = require('crypto');
const { requireAI, analyzeJSON } = require('../lib/aiCall');
const logger = require('../utils/logger');

const CHAT_MODEL = process.env.AI_CHAT_MODEL || 'claude-haiku-4-5-20251001';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// In-memory cache keyed on sorted dataClasses hash
const cache = new Map();

// Self-cleaning sweep — drop expired entries so the Map can't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of cache) if (val.expiresAt <= now) cache.delete(key);
}, 10 * 60 * 1000).unref();

async function analyse(req, res) {
  if (!requireAI(req, res)) return;

  const { dataClasses, breachCount } = req.body;

  if (!Array.isArray(dataClasses) || dataClasses.length === 0) {
    return res.status(400).json({ message: 'dataClasses is required' });
  }
  if (typeof breachCount !== 'number' || breachCount < 1) {
    return res.status(400).json({ message: 'breachCount is required' });
  }

  // Sanitise inputs
  const cleaned = dataClasses
    .filter(d => typeof d === 'string')
    .map(d => d.trim().slice(0, 60))
    .slice(0, 50);

  if (cleaned.length === 0) {
    return res.status(400).json({ message: 'No valid data classes provided' });
  }

  // Cache key — order-independent hash of classes + count
  const cacheKey = createHash('sha256')
    .update([...cleaned].sort().join(',') + String(breachCount))
    .digest('hex');

  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json({ ...cached.data, cached: true });
  }

  const prompt = `You are a cybersecurity expert advising a user of Byronaire Security, a personal security toolkit.

This user's email appeared in ${breachCount} data breach${breachCount !== 1 ? 'es' : ''}. The following types of personal data were exposed:

${cleaned.map(d => `- ${d}`).join('\n')}

Explain specifically what a real-world attacker can do with this exact combination of exposed data. Mention only threats genuinely enabled by the data types listed — credential stuffing, account takeover, targeted phishing, social engineering, identity theft, financial fraud, SIM swapping, etc. Be direct and specific to the data classes shown, not generic.

Then provide 3–4 concrete protective actions this user should take immediately.

Respond with ONLY valid JSON (no markdown fences, no explanation outside the JSON):
{
  "headline": <one sentence describing the primary risk — specific to the data exposed>,
  "explanation": <2–3 paragraphs, plain text, no markdown, no bullet points>,
  "actions": [<string>, <string>, <string>]
}`;

  let assessment;
  try {
    assessment = await analyzeJSON({
      userId:    req.user._id,
      feature:   'breach-impact',
      model:     CHAT_MODEL,
      content:   prompt,
      maxTokens: 800,
    });
  } catch (err) {
    logger.error('breach-impact.analyse.error', { message: err.message });
    return res.status(500).json({ message: 'AI analysis failed. Please try again.' });
  }

  cache.set(cacheKey, { data: assessment, expiresAt: Date.now() + CACHE_TTL });

  res.json(assessment);
}

module.exports = { analyse };
