const cron = require('node-cron');
const axios = require('axios');
const Parser = require('rss-parser');
const User = require('../models/User');
const { sendMail } = require('../utils/mailer');
const claude = require('../utils/claudeClient');

const CHAT_MODEL = process.env.CLAUDE_CHAT_MODEL || 'claude-haiku-4-5-20251001';
const APP_URL = process.env.CLIENT_ORIGIN || 'https://securecheck-nu.vercel.app';

const rssParser = new Parser();

async function fetchTopNews() {
  try {
    const feed = await rssParser.parseURL('https://feeds.feedburner.com/TheHackersNews');
    return (feed.items || []).slice(0, 5).map(item => item.title).filter(Boolean);
  } catch {
    return [];
  }
}

async function checkBreaches(email) {
  if (!process.env.HIBP_API_KEY) return null;
  try {
    const { data } = await axios.get(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}`,
      { headers: { 'hibp-api-key': process.env.HIBP_API_KEY, 'user-agent': 'InfinitySec-App' } }
    );
    return data;
  } catch (err) {
    if (err.response?.status === 404) return [];
    return null;
  }
}

async function generateDigest(user, breaches, newsItems) {
  const breachStatus = breaches === null
    ? 'Breach check unavailable this week.'
    : breaches.length === 0
      ? 'Your email was not found in any known data breaches.'
      : `Your email was found in ${breaches.length} breach${breaches.length > 1 ? 'es' : ''}: ${breaches.slice(0, 3).map(b => b.Name).join(', ')}${breaches.length > 3 ? ', and more' : ''}.`;

  const newsContext = newsItems.length > 0
    ? `Top security news headlines this week:\n${newsItems.map((n, i) => `${i + 1}. ${n}`).join('\n')}`
    : 'No news headlines available this week.';

  const prompt = `You are writing a weekly security digest email for a user of InfinitySec, a personal cybersecurity toolkit.

Breach status for this user: ${breachStatus}
Void Watch (automated monitoring): ${user.monitoring?.enabled ? 'enabled' : 'not enabled'}
${newsContext}

Write a concise, informative digest with three short sections. Be direct and specific — not generic. No markdown, no bullet points — plain prose only.

Respond with ONLY valid JSON (no markdown fences):
{
  "breachSection": <1-2 sentences about their specific breach status and what it means for them>,
  "newsSection": <2-3 sentences synthesising the week's top security stories, not just a list>,
  "actionSection": <1-2 sentences of one concrete action they should take this week, relevant to their situation>
}`;

  const msg = await claude.messages.create({
    model: CHAT_MODEL,
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = msg.content[0]?.text?.trim() || '';
  const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(jsonStr);
}

function buildHtmlEmail({ breachSection, newsSection, actionSection }) {
  const date = new Date().toLocaleDateString('en-IE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f8;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;max-width:600px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <tr><td style="background:#080810;padding:24px 32px;">
    <p style="color:#3B82F6;margin:0;font-size:20px;font-weight:800;letter-spacing:-0.01em;">InfinitySec</p>
    <p style="color:#A78BFA;margin:4px 0 0;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Weekly Security Briefing</p>
  </td></tr>
  <tr><td style="padding:28px 32px 4px;">
    <p style="color:#999;font-size:12px;margin:0 0 20px;">${date}</p>
    <h2 style="color:#111;font-size:16px;font-weight:700;margin:0 0 24px;">Your weekly security update is ready.</h2>

    <div style="margin-bottom:22px;">
      <p style="color:#3B82F6;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">Breach Status</p>
      <p style="color:#333;font-size:14px;line-height:1.65;margin:0;">${breachSection}</p>
    </div>

    <div style="margin-bottom:22px;padding:16px;background:#f8f9ff;border-radius:6px;border-left:3px solid #3B82F6;">
      <p style="color:#3B82F6;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">Security News</p>
      <p style="color:#333;font-size:14px;line-height:1.65;margin:0;">${newsSection}</p>
    </div>

    <div style="margin-bottom:28px;padding:16px;background:#f6f5ff;border-radius:6px;border-left:3px solid #A78BFA;">
      <p style="color:#7C3AED;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">This Week&apos;s Action</p>
      <p style="color:#333;font-size:14px;line-height:1.65;margin:0;">${actionSection}</p>
    </div>
  </td></tr>
  <tr><td style="background:#f8f8f8;padding:16px 32px;border-top:1px solid #eee;">
    <p style="color:#aaa;font-size:11px;margin:0 0 4px;">
      <a href="${APP_URL}/briefing" style="color:#3B82F6;text-decoration:none;">Manage briefing settings</a>
      &nbsp;&middot;&nbsp;
      <a href="${APP_URL}/account" style="color:#3B82F6;text-decoration:none;">Privacy dashboard</a>
    </p>
    <p style="color:#ccc;font-size:10px;margin:0;">AI-generated by Claude Haiku &middot; May contain inaccuracies &middot; Not professional security advice</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// Weekly — every Monday at 08:30
cron.schedule('30 8 * * 1', async () => {
  if (!process.env.ANTHROPIC_API_KEY || !process.env.SMTP_HOST) return;

  const newsItems = await fetchTopNews();

  const subscribers = await User.find({
    briefingEnabled: true,
    'aiConsent.accepted': true,
  }).select('email monitoring');

  for (const user of subscribers) {
    try {
      const breaches = await checkBreaches(user.email);
      // Throttle — HIBP rate limit is 1 request per 1500ms
      await new Promise(r => setTimeout(r, 1600));

      let digest;
      try {
        digest = await generateDigest(user, breaches, newsItems);
      } catch {
        continue; // Claude failed — skip this user this week
      }

      const html = buildHtmlEmail({
        breachSection:  digest.breachSection,
        newsSection:    digest.newsSection,
        actionSection:  digest.actionSection,
      });

      const breachCount = Array.isArray(breaches) ? breaches.length : 0;
      const subject = breachCount > 0
        ? `InfinitySec Briefing — ${breachCount} breach${breachCount > 1 ? 'es' : ''} detected`
        : 'InfinitySec Briefing — Your weekly security update';

      await sendMail({
        to:      user.email,
        subject,
        text:    [digest.breachSection, digest.newsSection, `This week's action: ${digest.actionSection}`, '', '— InfinitySec AI Briefing'].join('\n\n'),
        html,
      });
    } catch {
      // Skip this user, continue with others
    }
  }
});
