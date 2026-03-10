import { useState, useEffect } from 'react';
import { checkPasswordStrength } from '../utils/passwordStrength';
import api from '../utils/api';
import Reveal from '../components/Reveal';
import Spinner from '../components/Spinner';
import TrustBadge from '../components/TrustBadge';

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
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(26, 26, 62, 0.9)" strokeWidth="8" />
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
  const [savedList, setSavedList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const result = password ? checkPasswordStrength(password) : null;
  const isPerfect = result?.score === 100;

  useEffect(() => {
    api.get('/history')
      .then(({ data }) => setSavedList(data.filter(h => h.type === 'strength' && h.result?.password)))
      .finally(() => setLoadingList(false));
  }, []);

  const handleSave = async () => {
    if (!isPerfect) return;
    await api.post('/history', {
      type: 'strength',
      input: null,
      result: { score: 100, label: result.label, password, name: name.trim() || 'Untitled' },
    });
    setSaved(true);
    setName('');
    const { data } = await api.get('/history');
    setSavedList(data.filter(h => h.type === 'strength' && h.result?.password));
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = async (id) => {
    await api.delete(`/history/${id}`);
    setSavedList(prev => prev.filter(h => h._id !== id));
  };

  return (
    <main className="page checker-page">
      <h2>Password Strength Checker</h2>
      <TrustBadge badges={['Client-side only', 'Never transmitted', 'Zero server contact']} />
      <p className="muted">
        Your password is never sent anywhere — analysis runs entirely in your browser.
      </p>
      <input
        type="text"
        className="password-input"
        placeholder="Type a password to check..."
        value={password}
        onChange={(e) => { setPassword(e.target.value); setSaved(false); }}
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

            {isPerfect && (
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
            )}
          </div>
        </Reveal>
      )}

      <div className="saved-passwords">
        <h3>Saved Passwords</h3>
        {loadingList ? (
          <Spinner />
        ) : savedList.length === 0 ? (
          <p className="muted">No passwords saved yet. Reach 100% strength to save one.</p>
        ) : (
          savedList.map((entry) => (
            <div key={entry._id} className="saved-password-item">
              <div className="saved-password-info">
                {entry.result?.name && (
                  <span className="saved-password-label">{entry.result.name}</span>
                )}
                <code>{entry.result?.password ?? '—'}</code>
                <span className="saved-password-meta">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="saved-password-actions">
                <button
                  className="btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}
                  onClick={() => navigator.clipboard.writeText(entry.result?.password ?? '')}
                >
                  Copy
                </button>
                <button className="btn-danger-sm" onClick={() => handleDelete(entry._id)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
