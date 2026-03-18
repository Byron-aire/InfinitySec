const { createHash } = require('crypto');
const AuditLog = require('../models/AuditLog');
const claude = require('../utils/claudeClient');
const logger = require('../utils/logger');

const ANALYSIS_MODEL = process.env.CLAUDE_ANALYSIS_MODEL || 'claude-sonnet-4-6';

const VALID_METHODS = ['hardware-key', 'totp', 'push', 'sms', 'email-otp', 'none'];
const VALID_ACCOUNT_TYPES = ['email', 'banking', 'work', 'social', 'cloud', 'crypto', 'vpn', 'other'];

async function check(req, res) {
  if (!req.user.aiConsent?.accepted) {
    return res.status(403).json({ message: 'AI consent required' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ message: 'AI features not configured on this server' });
  }

  const { accounts } = req.body;

  if (!Array.isArray(accounts) || accounts.length === 0) {
    return res.status(400).json({ message: 'At least one account entry is required' });
  }
  if (accounts.length > 20) {
    return res.status(400).json({ message: 'Maximum 20 accounts per check' });
  }

  // Validate and sanitize each entry
  const sanitized = [];
  for (const entry of accounts) {
    if (typeof entry !== 'object' || entry === null) continue;
    const accountType = VALID_ACCOUNT_TYPES.includes(entry.type) ? entry.type : null;
    const method = VALID_METHODS.includes(entry.method) ? entry.method : null;
    const label = typeof entry.label === 'string' ? entry.label.slice(0, 60).trim() : null;
    if (accountType && method) {
      sanitized.push({ type: accountType, method, label: label || accountType });
    }
  }

  if (sanitized.length === 0) {
    return res.status(400).json({ message: 'No valid account entries provided' });
  }

  const METHOD_LABELS = {
    'hardware-key': 'Hardware Key (FIDO2/Passkey)',
    'totp':         'TOTP App (Google Auth, Authy, etc.)',
    'push':         'Push Notification (Duo, MS Authenticator)',
    'sms':          'SMS / Voice OTP',
    'email-otp':    'Email OTP',
    'none':         'No MFA',
  };

  const accountSummary = sanitized.map(a =>
    `- ${a.label} (${a.type}): ${METHOD_LABELS[a.method]}`
  ).join('\n');

  const prompt = `You are an MFA security analyst for InfinitySec, a personal cybersecurity toolkit.

A user has submitted their multi-factor authentication setup across their key accounts. Analyse each account's MFA method for vulnerability to MFA fatigue attacks and related weaknesses.

MFA Fatigue context:
- Hardware Key (FIDO2): phishing-resistant, not vulnerable to fatigue attacks — strongest
- TOTP App: resistant to fatigue attacks, weak to phishing if user enters code on fake site
- Push Notification: HIGH fatigue risk — attackers spam approvals hoping user clicks accept; also vulnerable to real-time phishing
- SMS/Voice: moderate fatigue via SIM-swap, SS7 attacks; also phishable — significantly weaker than TOTP
- Email OTP: weak — only as secure as email account; vulnerable if email is compromised
- No MFA: critical — no second factor whatsoever

User's MFA setup:
${accountSummary}

Scoring: Start at 100. Deduct per account:
- Hardware Key: 0 deduction (ideal)
- TOTP: 5 deduction
- Push: 15 deduction
- SMS: 20 deduction
- Email OTP: 25 deduction
- None: 35 deduction
Final score = max(0, 100 - total_deductions). Cap at 100.

Rating thresholds: Strong = 80-100, Moderate = 55-79, Weak = 30-54, Critical = 0-29

Fatigue risk: if any account uses Push → at least "medium". If 2+ use Push → "high". If any uses None → at least "high".

Rules:
- List a finding for every account that is not using a Hardware Key or TOTP
- For accounts with no MFA, severity is "critical"
- For SMS, severity is "high"
- For Push, severity is "medium" (fatigue risk)
- For TOTP and Hardware Key, severity is "info" (positive finding)
- Order findings: critical first, then high, medium, low, info
- Recommendations should be specific — name the accounts to upgrade

Respond with ONLY valid JSON — no markdown fences, no preamble:
{
  "overall_score": <integer 0–100>,
  "overall_rating": "Strong" | "Moderate" | "Weak" | "Critical",
  "fatigue_risk": "low" | "medium" | "high" | "critical",
  "summary": "<one sentence describing the overall MFA posture>",
  "findings": [
    {
      "account": "<account label>",
      "method": "<method name>",
      "severity": "critical" | "high" | "medium" | "low" | "info",
      "vulnerability": "<specific risk under 50 words>",
      "recommendation": "<one specific upgrade recommendation>"
    }
  ],
  "recommendations": ["<2-4 prioritised, actionable steps>"]
}`;

  const promptHash = createHash('sha256').update(JSON.stringify(sanitized)).digest('hex');
  let inputTokens = 0, outputTokens = 0, success = false;

  try {
    const msg = await claude.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    inputTokens  = msg.usage?.input_tokens  || 0;
    outputTokens = msg.usage?.output_tokens || 0;

    const raw = msg.content[0]?.text?.trim() || '';
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const assessment = JSON.parse(jsonStr);
    success = true;

    res.json(assessment);
  } catch (err) {
    logger.error('mfa-fatigue.check.error', { message: err.message });
    return res.status(500).json({ message: 'AI analysis failed. Please try again.' });
  } finally {
    AuditLog.create({
      userId:       req.user._id,
      feature:      'mfa-fatigue',
      promptHash,
      model:        ANALYSIS_MODEL,
      inputTokens,
      outputTokens,
      success,
    }).catch(() => {});
  }
}

module.exports = { check };
