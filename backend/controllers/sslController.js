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

  if (!clean || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(clean)) {
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
