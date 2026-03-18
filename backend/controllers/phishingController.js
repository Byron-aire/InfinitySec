const { createHash } = require('crypto');
const AuditLog = require('../models/AuditLog');
const claude = require('../utils/claudeClient');
const logger = require('../utils/logger');

const ANALYSIS_MODEL = process.env.CLAUDE_ANALYSIS_MODEL || 'claude-sonnet-4-6';
const MAX_TEXT = 8000; // chars
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB — Claude's vision limit

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const SYSTEM_PROMPT = `You are a phishing and social engineering analyst for InfinitySec, a personal cybersecurity toolkit.

Analyse the submitted content for signs of phishing, smishing, or social engineering.

Analyse for:
1. Urgency or fear language (e.g. "account will be suspended", "act now", "verify immediately")
2. Domain spoofing or suspicious links (e.g. paypa1.com, amaz0n-security.com, shortened URLs)
3. Credential harvesting (requests for passwords, PINs, card numbers, personal info)
4. Impersonation (pretending to be a bank, government body, courier, tech company)
5. Grammar and authenticity signals (poor grammar, generic greetings, unusual sender)
6. Legitimate signals (matches known communication patterns, no red flags)

Verdict rules:
- "phishing": clear malicious intent — credential harvesting, impersonation, malicious links
- "suspicious": multiple red flags but not conclusive — treat with caution
- "safe": no meaningful red flags — appears legitimate
- Confidence "high": strong evidence either way; "medium": some indicators; "low": limited signals

Respond with ONLY valid JSON — no markdown fences, no preamble:
{
  "verdict": "phishing" | "suspicious" | "safe",
  "confidence": "high" | "medium" | "low",
  "summary": "<one sentence describing the overall assessment>",
  "indicators": [
    {
      "category": "<string — e.g. Urgency Language, Domain Spoofing, Credential Harvesting, Impersonation, Grammar>",
      "severity": "critical" | "high" | "medium" | "low" | "info",
      "detail": "<specific finding under 60 words>"
    }
  ],
  "suspicious_links": ["<any suspicious URLs found, empty array if none>"],
  "recommendations": ["<2-3 concrete, actionable recommendations for the user>"]
}`;

async function analyse(req, res) {
  if (!req.user.aiConsent?.accepted) {
    return res.status(403).json({ message: 'AI consent required' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ message: 'AI features not configured on this server' });
  }

  // req.body comes from multer (multipart) — fields are strings
  const text    = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  const rawType = typeof req.body.type === 'string' ? req.body.type : 'email';
  const inputType = rawType === 'sms' ? 'sms' : 'email';
  const imageFile = req.file || null;

  // Must have at least text or image
  if (!text && !imageFile) {
    return res.status(400).json({ message: 'Paste message text or upload a screenshot — at least one is required' });
  }
  if (text && text.length > MAX_TEXT) {
    return res.status(400).json({ message: `Text too long — max ${MAX_TEXT} characters` });
  }
  if (imageFile) {
    if (!ALLOWED_MIME.includes(imageFile.mimetype)) {
      return res.status(400).json({ message: 'Image must be JPEG, PNG, WebP, or GIF' });
    }
    if (imageFile.size > MAX_IMAGE_BYTES) {
      return res.status(400).json({ message: 'Image too large — max 5MB' });
    }
  }

  // Build the user message content array for Claude
  const userContent = [];

  if (imageFile) {
    userContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: imageFile.mimetype,
        data: imageFile.buffer.toString('base64'),
      },
    });
  }

  // Build the text instruction block
  let textInstruction = '';
  if (text && imageFile) {
    textInstruction = `The user has submitted a screenshot of a ${inputType} message along with the following pasted text:\n\n--- MESSAGE TEXT ---\n${text}\n--- END ---\n\nAnalyse both the screenshot and the text together.`;
  } else if (text) {
    textInstruction = `The user has submitted the following ${inputType} message for analysis:\n\n--- MESSAGE START ---\n${text}\n--- MESSAGE END ---`;
  } else {
    textInstruction = `The user has submitted a screenshot of a ${inputType} message for analysis. Examine all visible text, links, sender details, branding, and layout.`;
  }

  userContent.push({ type: 'text', text: textInstruction });

  // Hash for audit log — based on text + image presence
  const hashInput = text + (imageFile ? imageFile.originalname + imageFile.size : '');
  const promptHash = createHash('sha256').update(hashInput).digest('hex');
  let inputTokens = 0, outputTokens = 0, success = false;

  try {
    const msg = await claude.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    });

    inputTokens  = msg.usage?.input_tokens  || 0;
    outputTokens = msg.usage?.output_tokens || 0;

    const raw = msg.content[0]?.text?.trim() || '';
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const assessment = JSON.parse(jsonStr);
    success = true;

    res.json(assessment);
  } catch (err) {
    logger.error('phishing.analyse.error', { message: err.message });
    return res.status(500).json({ message: 'AI analysis failed. Please try again.' });
  } finally {
    AuditLog.create({
      userId:       req.user._id,
      feature:      'phishing-analyser',
      promptHash,
      model:        ANALYSIS_MODEL,
      inputTokens,
      outputTokens,
      success,
    }).catch(() => {});
  }
}

module.exports = { analyse };
