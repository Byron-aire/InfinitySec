import { useState } from 'react';
import { checkPasswordStrength } from '../utils/passwordStrength';
import api from '../utils/api';

export default function PasswordCheckerPage() {
  const [password, setPassword] = useState('');
  const [saved, setSaved] = useState(false);

  const result = password ? checkPasswordStrength(password) : null;

  const handleSave = async () => {
    if (!result) return;
    await api.post('/history', {
      type: 'strength',
      input: null,
      result: { score: result.score, label: result.label },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <main className="page checker-page">
      <h2>Password Strength Checker</h2>
      <p className="muted">
        Your password is never sent anywhere — analysis runs entirely in your browser.
      </p>
      <input
        type="text"
        className="password-input"
        placeholder="Type a password to check..."
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setSaved(false);
        }}
      />
      {result && (
        <div className="strength-result">
          <div className="strength-meter-bar">
            <div
              className="strength-meter-fill"
              style={{ width: `${result.score}%`, backgroundColor: result.color }}
            />
          </div>
          <p style={{ color: result.color, fontWeight: 600 }}>
            {result.label} — {result.score}/100
          </p>
          <ul className="feedback-list">
            {result.feedback.map(({ criterion, met }) => (
              <li key={criterion} style={{ color: met ? 'var(--color-accent)' : 'var(--color-muted)' }}>
                {met ? '✓' : '✗'} {criterion}
              </li>
            ))}
          </ul>
          <button className="btn-primary" onClick={handleSave} disabled={saved}>
            {saved ? 'Saved!' : 'Save to History'}
          </button>
        </div>
      )}
    </main>
  );
}
