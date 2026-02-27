const axios = require('axios');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const checkBreach = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const response = await axios.get(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}`,
      {
        headers: {
          'hibp-api-key': process.env.HIBP_API_KEY,
          'user-agent': 'SecureCheck-App',
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
