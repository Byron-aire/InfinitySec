/**
 * Security Score engine — the single source of truth for a user's posture.
 *
 * Scores from 0–100 across server-known signals, and returns the exact
 * next-best-actions (with their point value) so the UI can say
 * "+20 — add a passkey". Replaces the old duplicated client/promptBuilder calcs.
 */
const PasswordCheck = require('../models/PasswordCheck');
const AuditLog = require('../models/AuditLog');

// Each factor is a posture signal worth N points. Points sum to 100.
const FACTORS = [
  { key: 'email-verified',   label: 'Email verified',                points: 10, route: '/account',  action: 'Verify your email address' },
  { key: 'password-hygiene', label: 'Password checked or generated', points: 15, route: '/checker',  action: 'Check or generate a strong password' },
  { key: 'breach-check',     label: 'Breach check run',              points: 15, route: '/breach',   action: 'Check your email for breaches' },
  { key: 'breach-monitor',   label: 'Weekly breach monitoring on',   points: 20, route: '/breach',   action: 'Turn on weekly breach monitoring' },
  { key: 'passkey',          label: 'Passkey registered',            points: 20, route: '/account',  action: 'Add a passkey for passwordless login' },
  { key: 'ai-review',        label: 'AI security review used',       points: 10, route: '/six-eyes', action: 'Get an AI review of your security' },
  { key: 'weekly-digest',    label: 'Weekly security digest on',     points: 10, route: '/briefing', action: 'Subscribe to the weekly security digest' },
];

function gradeFor(score) {
  if (score >= 96) return 'Maximum';
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Strong';
  if (score >= 50) return 'Moderate';
  if (score >= 25) return 'Basic';
  return 'Exposed';
}

/**
 * Compute the live score for a user document.
 * @returns {{ score, grade, factors, nextActions }}
 */
async function computeScore(user) {
  const uid = user._id;
  const [breachCount, pwCount, auditCount] = await Promise.all([
    PasswordCheck.countDocuments({ userId: uid, type: 'breach' }),
    PasswordCheck.countDocuments({ userId: uid, type: { $in: ['strength', 'generated'] } }),
    AuditLog.countDocuments({ userId: uid }),
  ]);

  const earned = {
    'email-verified':   !!user.emailVerified,
    'password-hygiene': pwCount > 0,
    'breach-check':     breachCount > 0,
    'breach-monitor':   !!user.monitoring?.enabled,
    'passkey':          (user.passkeys?.length || 0) > 0,
    'ai-review':        auditCount > 0,
    'weekly-digest':    !!user.briefingEnabled,
  };

  let score = 0;
  const factors = FACTORS.map(f => {
    const isEarned = earned[f.key];
    if (isEarned) score += f.points;
    return { key: f.key, label: f.label, earned: isEarned, points: f.points, route: f.route, action: f.action };
  });

  const nextActions = factors
    .filter(f => !f.earned)
    .sort((a, b) => b.points - a.points)
    .map(f => ({ key: f.key, label: f.action, route: f.route, points: f.points }));

  score = Math.min(100, score);
  return { score, grade: gradeFor(score), factors, nextActions };
}

module.exports = { computeScore, gradeFor };
