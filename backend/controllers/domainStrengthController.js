const axios = require('axios');
const sslChecker = require('ssl-checker');
const logger = require('../utils/logger');
const { requireAI, analyzeJSON } = require('../lib/aiCall');
const { assertPublicHost } = require('../lib/ssrfGuard');
const { cleanDomain } = require('../lib/domain');

const ANALYSIS_MODEL = process.env.AI_ANALYSIS_MODEL || 'claude-sonnet-4-6';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// In-memory cache: domain → { data, expiresAt }
const cache = new Map();

// Self-cleaning sweep — drop expired entries so the Map can't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of cache) if (val.expiresAt <= now) cache.delete(key);
}, 10 * 60 * 1000).unref();

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
      headers: { 'User-Agent': 'ByronaireSecurity-DomainAnalyser/2.5' },
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

function gradeFromScore(score) {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}

// Deterministic quick scan — SSL + Safe Browsing + headers, no AI. Instant, no consent needed.
async function quickScan(req, res) {
  const clean = cleanDomain(req.body.domain);
  if (!clean) {
    return res.status(400).json({ message: 'Enter a valid domain (e.g. example.com)' });
  }

  // SSRF guard — block internal/private targets before any outbound connection.
  try {
    await assertPublicHost(clean);
  } catch {
    return res.status(400).json({ message: 'That host is not allowed.' });
  }

  const [ssl, headers, safeBrowsing] = await Promise.all([
    sslChecker(clean, { method: 'GET', port: 443 }).catch(() => null),
    gatherSecurityHeaders(clean),
    gatherSafeBrowsing(clean),
  ]);

  const findings = [];
  let score = 0;

  // SSL — up to 30
  if (ssl && ssl.valid) {
    if (ssl.daysRemaining > 30) {
      score += 30;
    } else {
      score += 20;
      findings.push({ title: `SSL certificate expires in ${ssl.daysRemaining} days`, severity: 'high', detail: 'Renew soon to avoid an outage and browser warnings.' });
    }
  } else {
    findings.push({ title: 'SSL certificate invalid or unavailable', severity: 'critical', detail: 'No valid HTTPS certificate was found for this domain.' });
  }

  // Security headers — up to 40
  if (headers) {
    if (headers.hsts) score += 10; else findings.push({ title: 'Missing HSTS header', severity: 'medium', detail: 'Strict-Transport-Security forces HTTPS and blocks downgrade attacks.' });
    if (headers.csp) score += 10; else findings.push({ title: 'Missing Content-Security-Policy', severity: 'medium', detail: 'CSP is the primary defence against cross-site scripting.' });
    if (headers.xFrameOptions) score += 8; else findings.push({ title: 'Missing X-Frame-Options', severity: 'low', detail: 'Without it the site can be framed for clickjacking.' });
    if (headers.xContentTypeOptions) score += 6;
    if (headers.referrerPolicy) score += 3;
    if (headers.permissionsPolicy) score += 3;
    if (headers.serverHeader) findings.push({ title: `Server header leaks technology (${headers.serverHeader})`, severity: 'low', detail: 'Hide or genericise the Server header to reduce fingerprinting.' });
  } else {
    findings.push({ title: 'Could not read security headers', severity: 'info', detail: 'The site did not respond to an HTTPS request in time.' });
  }

  // Domain age not checked in quick mode — award neutral credit
  score += 5;

  // Safe Browsing — up to 20
  if (safeBrowsing) {
    if (safeBrowsing.safe) {
      score += 20;
    } else {
      findings.push({ title: 'Flagged by Google Safe Browsing', severity: 'critical', detail: `Threats detected: ${safeBrowsing.threats.join(', ')}. Do not visit.` });
    }
  } else {
    score += 10;
    findings.push({ title: 'Safe Browsing check unavailable', severity: 'info', detail: 'Could not reach Google Safe Browsing for this domain.' });
  }

  score = Math.min(100, score);
  findings.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return order[a.severity] - order[b.severity];
  });

  res.json({
    domain: clean,
    mode: 'quick',
    score,
    grade: gradeFromScore(score),
    summary: safeBrowsing && !safeBrowsing.safe
      ? 'This domain is flagged as malicious — avoid it.'
      : `Quick scan complete — ${findings.length} item${findings.length === 1 ? '' : 's'} noted. Run a deep scan for AI analysis and domain-age signals.`,
    signals: {
      domain: clean,
      ssl: ssl ? { valid: ssl.valid, daysRemaining: ssl.daysRemaining, issuer: ssl.issuer, validFrom: ssl.validFrom, validTo: ssl.validTo } : null,
      securityHeaders: headers,
      safeBrowsing,
    },
    findings,
    recommendations: [],
  });
}

async function analyse(req, res) {
  if (!requireAI(req, res)) return;

  const clean = cleanDomain(req.body.domain);
  if (!clean) {
    return res.status(400).json({ message: 'Enter a valid domain (e.g. example.com)' });
  }

  // SSRF guard — block internal/private targets before any outbound connection.
  try {
    await assertPublicHost(clean);
  } catch {
    return res.status(400).json({ message: 'That host is not allowed.' });
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

  const prompt = `You are a domain security analyst for Byronaire Security, a personal cybersecurity toolkit.

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

  let assessment;
  try {
    assessment = await analyzeJSON({
      userId:    req.user._id,
      feature:   'domain-strength',
      model:     ANALYSIS_MODEL,
      content:   prompt,
      maxTokens: 1024,
    });
  } catch (err) {
    logger.error('domain-strength.analyse.error', { message: err.message });
    return res.status(500).json({ message: 'AI analysis failed. Please try again.' });
  }

  const payload = { domain: clean, signals, ...assessment };

  cache.set(clean, { data: payload, expiresAt: Date.now() + CACHE_TTL });

  res.json(payload);
}

module.exports = { analyse, quickScan };
