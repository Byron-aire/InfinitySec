/**
 * Builds system prompts for Six Eyes AI calls.
 * Injects the user's security posture as structured context.
 * Never includes raw passwords, emails, or other PII.
 */

const GRADES = [
  { min: 96, label: 'Special Grade' },
  { min: 85, label: 'Semi-Grade 1' },
  { min: 70, label: 'Grade 1' },
  { min: 50, label: 'Grade 2' },
  { min: 25, label: 'Grade 3' },
  { min: 0,  label: 'Grade 4' },
];

function calcScore({ voidwatchEnabled, hasBreachCheck, hasPasswordSaved, hasStrengthCheck }) {
  let s = 0;
  if (voidwatchEnabled)  s += 30;
  if (hasBreachCheck)    s += 25;
  if (hasPasswordSaved)  s += 20;
  if (hasStrengthCheck)  s += 10;
  return Math.min(100, s);
}

function getGradeLabel(score) {
  return (GRADES.find(g => score >= g.min) ?? GRADES[GRADES.length - 1]).label;
}

/**
 * @param {Object} ctx
 * @param {Boolean} ctx.voidwatchEnabled
 * @param {Number}  ctx.strengthCount
 * @param {Number}  ctx.breachCount
 * @param {Number}  ctx.generatedCount
 * @param {Number}  ctx.sessionCount
 */
function buildSixEyesSystemPrompt(ctx) {
  const score = calcScore({
    voidwatchEnabled:  ctx.voidwatchEnabled,
    hasBreachCheck:    ctx.breachCount > 0,
    hasPasswordSaved:  ctx.generatedCount > 0,
    hasStrengthCheck:  ctx.strengthCount > 0,
  });
  const grade = getGradeLabel(score);

  return `You are Six Eyes, the AI security assistant for InfinitySec — a personal cybersecurity toolkit. Named after Gojo Satoru's Six Eyes technique: infinite information processing, perfect clarity.

Your role: help this specific user understand cybersecurity, interpret their security posture, and take concrete steps to improve it. Be direct, specific, and technically accurate.

User's current security posture:
- Security Score: ${score}/100 (${grade})
- Void Watch (weekly breach monitoring): ${ctx.voidwatchEnabled ? 'enabled' : 'not enabled'}
- Password strength checks run: ${ctx.strengthCount}
- Breach checks run: ${ctx.breachCount}
- Passwords saved in vault: ${ctx.generatedCount}
- Active sessions: ${ctx.sessionCount}

Rules:
- Stay focused on cybersecurity and InfinitySec features
- Plain text only — no markdown headers, no hyphens as bullets, no asterisks
- When recommending an InfinitySec tool, name the page (e.g. "run a check in the Breach Checker")
- Keep responses to 2-3 short paragraphs unless detail is genuinely needed
- Never ask for or accept passwords, API keys, or other credentials
- If asked something outside cybersecurity, briefly redirect`;
}

module.exports = { buildSixEyesSystemPrompt };
