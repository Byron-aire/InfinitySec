const { createHash } = require('crypto');
const AuditLog = require('../models/AuditLog');
const claude = require('../utils/claudeClient');
const logger = require('../utils/logger');

const ANALYSIS_MODEL = process.env.CLAUDE_ANALYSIS_MODEL || 'claude-sonnet-4-6';
const MAX_INPUT = 9000; // chars — enough for a full package.json

async function scan(req, res) {
  if (!req.user.aiConsent?.accepted) {
    return res.status(403).json({ message: 'AI consent required' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ message: 'AI features not configured on this server' });
  }

  const { packageJson } = req.body;

  if (!packageJson || typeof packageJson !== 'string' || packageJson.trim().length === 0) {
    return res.status(400).json({ message: 'package.json content is required' });
  }
  if (packageJson.length > MAX_INPUT) {
    return res.status(400).json({ message: `Input too long — paste only the dependencies/devDependencies sections (max ${MAX_INPUT} chars)` });
  }

  // Validate it's roughly JSON-shaped before sending to Claude
  let parsed;
  try {
    parsed = JSON.parse(packageJson.trim());
  } catch {
    return res.status(400).json({ message: 'Invalid JSON — paste valid package.json content' });
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return res.status(400).json({ message: 'Invalid package.json format' });
  }

  const clean = packageJson.trim();

  const prompt = `You are a software supply chain security analyst for InfinitySec, a personal cybersecurity toolkit.

A user has submitted their package.json for security analysis. Examine every dependency listed.

--- PACKAGE.JSON START ---
${clean}
--- PACKAGE.JSON END ---

Check for:
1. **Typosquatting** — package names that closely resemble popular packages with subtle misspellings (e.g. "lodahs" vs "lodash", "expres" vs "express", "requiest" vs "request")
2. **Suspicious patterns** — packages with very generic names, random characters, or unusual naming
3. **Known risky package categories** — packages that commonly request dangerous permissions (postinstall scripts, native addons) when not expected
4. **Deprecated or abandoned packages** — packages known to be unmaintained (e.g. "request", "node-uuid", "colors" post-incident)
5. **Version pinning risks** — use of "*" or very broad ranges that allow malicious updates
6. **Legitimate green flags** — well-known, maintained packages with no red flags

Rules:
- Only flag concrete, specific concerns — do not fabricate vulnerabilities for packages you are uncertain about
- Mark findings "info" if uncertain — do not escalate without evidence
- Count total packages in both dependencies + devDependencies for total_packages
- flagged_count is the count of packages with severity critical/high/medium

Respond with ONLY valid JSON — no markdown fences, no preamble:
{
  "risk_level": "low" | "medium" | "high" | "critical",
  "summary": "<one sentence overall assessment>",
  "total_packages": <integer>,
  "flagged_count": <integer>,
  "findings": [
    {
      "package": "<package name>",
      "issue": "<short issue title>",
      "severity": "critical" | "high" | "medium" | "low" | "info",
      "detail": "<specific concern under 60 words>"
    }
  ],
  "recommendations": ["<2-4 concrete, actionable recommendations>"]
}`;

  const promptHash = createHash('sha256').update(clean).digest('hex');
  let inputTokens = 0, outputTokens = 0, success = false;

  try {
    const msg = await claude.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 2048,
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
    logger.error('supply-chain.scan.error', { message: err.message });
    return res.status(500).json({ message: 'AI analysis failed. Please try again.' });
  } finally {
    AuditLog.create({
      userId:       req.user._id,
      feature:      'supply-chain',
      promptHash,
      model:        ANALYSIS_MODEL,
      inputTokens,
      outputTokens,
      success,
    }).catch(() => {});
  }
}

module.exports = { scan };
