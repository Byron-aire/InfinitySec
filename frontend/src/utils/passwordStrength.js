export const checkPasswordStrength = (password) => {
  let score = 0;

  if (password.length >= 8)  score += 10;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  if (password.length >= 20) score += 10;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[a-z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;

  score = Math.min(score, 100);

  let label, color;
  if (score < 40) {
    label = 'Weak';
    color = 'var(--color-danger)';
  } else if (score < 60) {
    label = 'Fair';
    color = 'var(--color-fair)';
  } else if (score < 80) {
    label = 'Strong';
    color = 'var(--color-strong)';
  } else {
    label = 'Very Strong';
    color = 'var(--color-accent)';
  }

  const feedback = [
    { criterion: 'At least 8 characters',  met: password.length >= 8 },
    { criterion: 'At least 12 characters', met: password.length >= 12 },
    { criterion: 'Uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { criterion: 'Number (0-9)',           met: /[0-9]/.test(password) },
    { criterion: 'Symbol (!@#$%...)',      met: /[^A-Za-z0-9]/.test(password) },
  ];

  return { score, label, color, feedback };
};
