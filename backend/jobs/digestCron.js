const cron = require('node-cron');
const axios = require('axios');
const nodemailer = require('nodemailer');
const User = require('../models/User');

function createTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function checkEmailBreaches(email) {
  try {
    const { data } = await axios.get(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}`,
      { headers: { 'hibp-api-key': process.env.HIBP_API_KEY, 'user-agent': 'InfinitySec-App' } }
    );
    return data;
  } catch (err) {
    if (err.response?.status === 404) return [];
    throw err;
  }
}

async function sendAlertEmail(transporter, email, breaches) {
  const breachList = breaches.map(b => `• ${b.Name} (${b.BreachDate})`).join('\n');
  await transporter.sendMail({
    from:    process.env.SMTP_FROM || 'InfinitySec <noreply@infinitysec.io>',
    to:      email,
    subject: `InfinitySec Void Watch — ${breaches.length} breach${breaches.length > 1 ? 'es' : ''} found`,
    text: [
      `Your weekly InfinitySec security scan is complete.`,
      ``,
      `Your email (${email}) was found in ${breaches.length} known data breach${breaches.length > 1 ? 'es' : ''}:`,
      ``,
      breachList,
      ``,
      `We recommend changing your password on any affected services and enabling 2FA where possible.`,
      ``,
      `— InfinitySec`,
    ].join('\n'),
  });
}

// Weekly — every Monday at 08:00
cron.schedule('0 8 * * 1', async () => {
  if (!process.env.HIBP_API_KEY || !process.env.SMTP_HOST) return;

  let transporter;
  try {
    transporter = createTransporter();
  } catch {
    return;
  }

  const subscribers = await User.find({ 'monitoring.enabled': true }).select('email');

  for (const user of subscribers) {
    try {
      const breaches = await checkEmailBreaches(user.email);
      if (breaches.length > 0) {
        await sendAlertEmail(transporter, user.email, breaches);
      }
      // Throttle — HIBP rate limit is 1 request per 1500ms
      await new Promise(r => setTimeout(r, 1600));
    } catch {
      // Skip this user, continue with others
    }
  }
});
