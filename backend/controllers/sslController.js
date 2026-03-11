const sslChecker = require('ssl-checker');

async function checkSSL(req, res) {
  const { domain } = req.body;
  if (!domain || typeof domain !== 'string') {
    return res.status(400).json({ error: 'Domain is required' });
  }

  const clean = domain
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .trim()
    .toLowerCase();

  // RFC 1123 hostname validation — each label 1-63 chars, no leading/trailing hyphens, max 253 chars total
  const DOMAIN_REGEX = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
  if (!clean || clean.length > 253 || !DOMAIN_REGEX.test(clean)) {
    return res.status(400).json({ error: 'Enter a valid domain (e.g. example.com)' });
  }

  try {
    const result = await sslChecker(clean, { method: 'GET', port: 443 });
    res.json({ domain: clean, ...result });
  } catch {
    res.status(400).json({ error: 'Could not retrieve SSL info. Make sure the domain exists and supports HTTPS.' });
  }
}

module.exports = { checkSSL };
