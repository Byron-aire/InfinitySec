const axios = require('axios');

// RFC 5321 max email length is 254. Local part max 64, domain max 255.
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]{1,64}@[a-zA-Z0-9.\-]{1,255}\.[a-zA-Z]{2,63}$/;

const checkBreach = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (email.length > 254 || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const response = await axios.get(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}`,
      {
        headers: {
          'hibp-api-key': process.env.HIBP_API_KEY,
          'user-agent': 'InfinitySec-App',
        },
      }
    );

    return res.json({ breached: true, breaches: response.data, count: response.data.length });
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return res.json({ breached: false, breaches: [], count: 0 });
    }
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { checkBreach };
