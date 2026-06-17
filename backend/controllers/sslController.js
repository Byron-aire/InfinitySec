const sslChecker = require('ssl-checker');
const { assertPublicHost } = require('../lib/ssrfGuard');
const { cleanDomain } = require('../lib/domain');

async function checkSSL(req, res) {
  const clean = cleanDomain(req.body.domain);
  if (!clean) {
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
