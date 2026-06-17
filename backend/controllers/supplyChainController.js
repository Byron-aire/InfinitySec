const { requireAI, analyzeJSON } = require('../lib/aiCall');
const logger = require('../utils/logger');

const ANALYSIS_MODEL = process.env.AI_ANALYSIS_MODEL || 'claude-sonnet-4-6';
const MAX_INPUT = 9000; // chars — enough for a full package.json

async function scan(req, res) {
  if (!requireAI(req, res)) return;

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

  const prompt = `You are a software supply chain security analyst for Byronaire Security, a personal cybersecurity toolkit.

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

  try {
    const assessment = await analyzeJSON({
      userId:    req.user._id,
      feature:   'supply-chain',
      model:     ANALYSIS_MODEL,
      content:   prompt,
      hashInput: clean,
      maxTokens: 2048,
    });
    res.json(assessment);
  } catch (err) {
    logger.error('supply-chain.scan.error', { message: err.message });
    res.status(500).json({ message: 'AI analysis failed. Please try again.' });
  }
}

module.exports = { scan };
