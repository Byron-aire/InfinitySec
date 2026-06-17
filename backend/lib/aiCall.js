/**
 * Shared Claude-call plumbing for the AI analysers.
 *
 * Every analyser (phishing, supply-chain, mfa-fatigue, domain-strength,
 * breach-impact) repeated the same ~25 lines: consent gate, prompt hashing,
 * the create() call, token capture, markdown-fence stripping, and a
 * fire-and-forget AuditLog. This centralises all of it so controllers only
 * own their input validation, prompt, and response shape.
 */
const { createHash } = require('crypto');
const AuditLog = require('../models/AuditLog');
const ai = require('../utils/aiClient');

/**
 * Consent + configuration gate. Returns true if the request may proceed;
 * otherwise writes the appropriate response and returns false.
 */
function requireAI(req, res) {
  if (!req.user?.aiConsent?.accepted) {
    res.status(403).json({ message: 'AI consent required' });
    return false;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(503).json({ message: 'AI features not configured on this server' });
    return false;
  }
  return true;
}

/** Strip optional markdown fences and parse the model's JSON output. */
function parseJsonResponse(raw) {
  const s = (raw || '').trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(s);
}

/**
 * One-shot JSON analysis. Hashes the prompt, calls Claude with an explicit
 * timeout, captures token usage, writes a fire-and-forget AuditLog, and returns
 * the parsed JSON. Throws on API/parse failure (caller maps to a 500).
 *
 * @param {string|Array} content  - user message content (string, or multimodal array)
 * @param {string} [hashInput]    - text to hash for the audit log (defaults to content)
 */
async function analyzeJSON({ userId, feature, model, content, hashInput, system, maxTokens = 1024, timeoutMs = 30000 }) {
  const toHash = hashInput ?? (typeof content === 'string' ? content : JSON.stringify(content));
  const promptHash = createHash('sha256').update(toHash).digest('hex');
  let inputTokens = 0, outputTokens = 0, success = false;
  try {
    const msg = await ai.messages.create({
      model,
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages: [{ role: 'user', content }],
    }, { timeout: timeoutMs });
    inputTokens  = msg.usage?.input_tokens  || 0;
    outputTokens = msg.usage?.output_tokens || 0;
    const data = parseJsonResponse(msg.content[0]?.text);
    success = true;
    return data;
  } finally {
    AuditLog.create({ userId, feature, promptHash, model, inputTokens, outputTokens, success }).catch(() => {});
  }
}

module.exports = { requireAI, analyzeJSON, parseJsonResponse };
