import { useState } from 'react';
import { checkPasswordStrength } from '../utils/passwordStrength';
import api from '../utils/api';
import Reveal from '../components/Reveal';

function CircularGauge({ score, color }) {
  const r = 56, cx = 70, cy = 70;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <defs>
        <filter id="gauge-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="rgba(26, 26, 62, 0.9)"
        strokeWidth="8"
      />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        filter="url(#gauge-glow)"
        style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s ease' }}
      />
      <text
        x={cx} y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#F5F5F5"
        fontSize="24"
        fontWeight="700"
        fontFamily="Inter, sans-serif"
      >
        {score}
      </text>
    </svg>
  );
}

export default function PasswordCheckerPage() {
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);

  const result = password ? checkPasswordStrength(password) : null;
  const isPerfect = result?.score === 100;

  const handleSave = async () => {
    if (!result) return;
    await api.post('/history', {
      type: 'strength',
      input: null,
      result: isPerfect
        ? { score: result.score, label: result.label, password, name: name.trim() || 'Untitled' }
        : { score: result.score, label: result.label },
    });
    setSaved(true);
    setName('');
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
        <Reveal>
          <div className="strength-result">
            <div className="gauge-wrapper">
              <CircularGauge score={result.score} color={result.color} />
              <p className="gauge-label" style={{ color: result.color }}>{result.label}</p>
            </div>
            <ul className="feedback-list">
              {result.feedback.map(({ criterion, met }) => (
                <li key={criterion} style={{ color: met ? 'var(--color-safe)' : 'var(--color-muted)' }}>
                  {met ? '✓' : '✗'} {criterion}
                </li>
              ))}
            </ul>

            {isPerfect ? (
              <div className="checker-save-section">
                <p className="checker-save-hint">
                  This password is perfect — save it to your vault with a label.
                </p>
                <div className="save-row">
                  <input
                    type="text"
                    className="label-input"
                    placeholder="Label (e.g. Gmail, Netflix)"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    maxLength={40}
                  />
                  <button className="btn-primary" onClick={handleSave} disabled={saved}>
                    {saved ? 'Saved!' : 'Save Password'}
                  </button>
                </div>
              </div>
            ) : (
              <button className="btn-primary" onClick={handleSave} disabled={saved}>
                {saved ? 'Saved!' : 'Save to History'}
              </button>
            )}
          </div>
        </Reveal>
      )}
    </main>
  );
}
