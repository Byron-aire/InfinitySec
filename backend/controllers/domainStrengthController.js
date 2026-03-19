const { createHash } = require('crypto');
const axios = require('axios');
const sslChecker = require('ssl-checker');
const AuditLog = require('../models/AuditLog');
const ai = require('../utils/aiClient');

const ANALYSIS_MODEL = process.env.AI_ANALYSIS_MODEL || 'claude-sonnet-4-6';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// In-memory cache: domain → { data, expiresAt }
const cache = new Map();

const DOMAIN_REGEX = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

// Extract registered domain (last 2 labels) for RDAP
function getRegisteredDomain(hostname) {
  const parts = hostname.split('.');
  return parts.length >= 2 ? parts.slice(-2).join('.') : hostname;
}

async function gatherSecurityHeaders(domain) {
  try {
    const response = await axios.get(`https://${domain}`, {
      timeout: 8000,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: { 'User-Agent': 'InfinitySec-DomainAnalyser/2.5' },
    });
    const h = response.headers;
    return {
      hsts:                !!h['strict-transport-security'],
      csp:                 !!h['content-security-policy'],
      xFrameOptions:       !!h['x-frame-options'],
      xContentTypeOptions: h['x-content-type-options'] === 'nosniff',
      referrerPolicy:      !!h['referrer-policy'],
      permissionsPolicy:   !!h['permissions-policy'],
      serverHeader:        h['server'] || null,
    };
  } catch {
    return null;
  }
}

async function gatherRDAP(domain) {
  const registered = getRegisteredDomain(domain);
  try {
    const { data } = await axios.get(`https://rdap.org/domain/${registered}`, {
      timeout: 8000,
      headers: { Accept: 'application/rdap+json, application/json' },
    });
    const events = data.events || [];
    const regEvent = events.find(e => e.eventAction === 'registration');
    const expEvent = events.find(e => e.eventAction === 'expiration');
    const registrationDate = regEvent?.eventDate || null;
    const expirationDate   = expEvent?.eventDate || null;

    let ageYears = null;
    if (registrationDate) {
      const ms = Date.now() - new Date(registrationDate).getTime();
      ageYears = parseFloat((ms / (365.25 * 24 * 3600 * 1000)).toFixed(1));
    }

    return { registrationDate, expirationDate, ageYears };
  } catch {
    return null;
  }
}

async function gatherSafeBrowsing(domain) {
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_KEY;
  if (!apiKey) return null;
  try {
    const { data } = await axios.post(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
      {
        client: { clientId: 'infinitysec', clientVersion: '2.5.0' },
        threatInfo: {
          threatTypes:      ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
          platformTypes:    ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries:    [{ url: `https://${domain}/` }],
        },
      },
      { timeout: 8000 }
    );
    const matches = data.matches || [];
    return { safe: matches.length === 0, threats: matches.map(m => m.threatType) };
  } catch {
    return null;
  }
}

async function analyse(req, res) {
  if (!req.user.aiConsent?.accepted) {
    return res.status(403).json({ message: 'AI consent required' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ message: 'AI features not configured on this server' });
  }

  const { domain } = req.body;
  if (!domain || typeof domain !== 'string') {
    return res.status(400).json({ message: 'Domain is required' });
  }

  const clean = domain
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .trim()
    .toLowerCase();

  if (!clean || clean.length > 253 || !DOMAIN_REGEX.test(clean)) {
    return res.status(400).json({ message: 'Enter a valid domain (e.g. example.com)' });
  }

  // Cache hit
  const cached = cache.get(clean);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json({ ...cached.data, cached: true });
  }

  // Gather all signals in parallel
  const [ssl, headers, rdap, safeBrowsing] = await Promise.all([
    sslChecker(clean, { method: 'GET', port: 443 }).catch(() => null),
    gatherSecurityHeaders(clean),
    gatherRDAP(clean),
    gatherSafeBrowsing(clean),
  ]);

  const signals = {
    domain: clean,
    ssl: ssl
      ? { valid: ssl.valid, daysRemaining: ssl.daysRemaining, issuer: ssl.issuer, validFrom: ssl.validFrom, validTo: ssl.validTo }
      : null,
    securityHeaders: headers,
    domainAge: rdap,
    safeBrowsing,
  };

  const prompt = `You are a domain security analyst for InfinitySec, a personal cybersecurity toolkit.

Analyse the signals below for domain "${clean}" and produce a structured security assessment.

Signals:
${JSON.stringify(signals, null, 2)}

Scoring guide (use as starting point, apply judgement):
- SSL validity and days remaining: up to 30 points
  (valid + >30 days = 30pts, valid + ≤30 days = 20pts, expired/missing = 0pts)
- Security headers (up to 40 points):
  HSTS 10pts, CSP 10pts, X-Frame-Options 8pts, X-Content-Type-Options 6pts, Referrer-Policy 3pts, Permissions-Policy 3pts
- Domain age (up to 10 points):
  >2 years = 10pts, 6 months–2 years = 6pts, <6 months = 2pts, unknown = 5pts
- Safe Browsing (up to 20 points):
  clean = 20pts, threats detected = 0pts, unavailable = 10pts
Grade thresholds: A = 90–100, B = 75–89, C = 60–74, D = 45–59, F = 0–44

Rules:
- If a signal is null (check failed), note it in findings as "check unavailable" with severity "info" — do not penalise heavily
- A server header that leaks technology (e.g. "Apache/2.4.52") is a low severity finding
- An expired or soon-expiring SSL cert is a critical finding
- A Safe Browsing threat is a critical finding
- List 3–6 findings total, ordered by severity (critical first)
- List 2–4 concrete, actionable recommendations
- Keep detail fields under 60 words each
- summary: one sentence describing the overall security posture

Respond with ONLY valid JSON — no markdown fences, no preamble:
{
  "score": <integer 0–100>,
  "grade": <"A" | "B" | "C" | "D" | "F">,
  "summary": <string>,
  "findings": [
    { "title": <string>, "severity": <"critical" | "high" | "medium" | "low" | "info">, "detail": <string> }
  ],
  "recommendations": [<string>]
}`;

  const promptHash = createHash('sha256').update(prompt).digest('hex');
  let inputTokens = 0, outputTokens = 0, success = false;
  let assessment;

  try {
    const msg = await ai.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    inputTokens  = msg.usage?.input_tokens  || 0;
    outputTokens = msg.usage?.output_tokens || 0;

    const raw = msg.content[0]?.text?.trim() || '';
    // Strip markdown code fences if AI wraps in them
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    assessment = JSON.parse(jsonStr);
    success = true;
  } catch {
    return res.status(500).json({ message: 'AI analysis failed. Please try again.' });
  } finally {
    AuditLog.create({
      userId:       req.user._id,
      feature:      'domain-strength',
      promptHash,
      model:        ANALYSIS_MODEL,
      inputTokens,
      outputTokens,
      success,
    }).catch(() => {});
  }

  const payload = { domain: clean, signals, ...assessment };

  cache.set(clean, { data: payload, expiresAt: Date.now() + CACHE_TTL });

  res.json(payload);
}

module.exports = { analyse };
