const axios = require('axios');

const THREAT_LABELS = {
  MALWARE:                        'Malware',
  SOCIAL_ENGINEERING:             'Phishing / Social Engineering',
  UNWANTED_SOFTWARE:              'Unwanted Software',
  POTENTIALLY_HARMFUL_APPLICATION:'Potentially Harmful App',
};

async function checkURL(req, res) {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  let parsed;
  try {
    parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
  } catch {
    return res.status(400).json({ error: 'Enter a valid URL (e.g. https://example.com)' });
  }

  const apiKey = process.env.GOOGLE_SAFE_BROWSING_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'URL scanning is not available yet — API key not configured.' });
  }

  try {
    const { data } = await axios.post(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
      {
        client: { clientId: 'infinitysec', clientVersion: '2.0.0' },
        threatInfo: {
          threatTypes:      ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
          platformTypes:    ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries:    [{ url: parsed.href }],
        },
      }
    );

    const matches = data.matches || [];
    if (matches.length === 0) {
      return res.json({ safe: true, url: parsed.href, threats: [] });
    }

    const threats = [...new Set(matches.map(m => m.threatType))].map(t => ({
      type: t,
      label: THREAT_LABELS[t] || t,
    }));

    return res.json({ safe: false, url: parsed.href, threats });
  } catch {
    return res.status(500).json({ error: 'Scan failed. Try again shortly.' });
  }
}

module.exports = { checkURL };
