const { requireAI, analyzeJSON } = require('../lib/aiCall');
const logger = require('../utils/logger');

const ANALYSIS_MODEL = process.env.AI_ANALYSIS_MODEL || 'claude-sonnet-4-6';
const MAX_TEXT = 8000; // chars
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB — vision size limit

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const SYSTEM_PROMPT = `You are a phishing and social engineering analyst for Byronaire Security, a personal cybersecurity toolkit.

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
  if (!requireAI(req, res)) return;

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

  // Build the user message content array
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

  // Hash for audit log — based on text + image presence (not raw image bytes)
  const hashInput = text + (imageFile ? imageFile.originalname + imageFile.size : '');

  try {
    const assessment = await analyzeJSON({
      userId:    req.user._id,
      feature:   'phishing-analyser',
      model:     ANALYSIS_MODEL,
      system:    SYSTEM_PROMPT,
      content:   userContent,
      hashInput,
      maxTokens: 1024,
    });
    res.json(assessment);
  } catch (err) {
    logger.error('phishing.analyse.error', { message: err.message });
    res.status(500).json({ message: 'AI analysis failed. Please try again.' });
  }
}

module.exports = { analyse };
