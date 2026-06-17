const sslChecker = require('ssl-checker');
const { assertPublicHost } = require('../lib/ssrfGuard');

async function checkSSL(req, res) {
  const { domain } = req.body;
  if (!domain || typeof domain !== 'string') {
    return res.status(400).json({ message: 'Domain is required' });
  }

  const clean = domain
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .trim()
    .toLowerCase();

  // RFC 1123 hostname validation — each label 1-63 chars, no leading/trailing hyphens, max 253 chars total
  const DOMAIN_REGEX = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
  if (!clean || clean.length > 253 || !DOMAIN_REGEX.test(clean)) {
    return res.status(400).json({ message: 'Enter a valid domain (e.g. example.com)' });
  }

  // SSRF guard — never let the scanner connect to internal/private hosts.
  try {
    await assertPublicHost(clean);
  } catch {
    return res.status(400).json({ message: 'That host is not allowed.' });
  }

  try {
    const result = await sslChecker(clean, { method: 'GET', port: 443 });
    res.json({ domain: clean, ...result });
  } catch {
    res.status(400).json({ message: 'Could not retrieve SSL info. Make sure the domain exists and supports HTTPS.' });
  }
}

module.exports = { checkSSL };
