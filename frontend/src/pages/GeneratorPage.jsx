import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import Spinner from '../components/Spinner';

const CHARS = {
  upper:   'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower:   'abcdefghijklmnopqrstuvwxyz',
  digits:  '0123456789',
  symbols: '!@#$%^&*()-_=+[]{}|;:,.<>?',
};

const SCRAMBLE_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

function generatePassword(length, options) {
  const pool = Object.entries(options)
    .filter(([, v]) => v)
    .map(([k]) => CHARS[k])
    .join('');
  if (!pool) return '';
  const arr = new Uint32Array(length);
  window.crypto.getRandomValues(arr);
  return Array.from(arr, (n) => pool[n % pool.length]).join('');
}

export default function GeneratorPage() {
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState({ upper: true, lower: true, digits: true, symbols: false });
  const [password, setPassword] = useState('');
  const [displayPw, setDisplayPw] = useState('');
  const [label, setLabel] = useState('');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedList, setSavedList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const scrambleRef = useRef(null);

  const anySelected = Object.values(options).some(Boolean);

  useEffect(() => {
    const fetchSaved = async () => {
      try {
        const { data } = await api.get('/history');
        setSavedList(data.filter((h) => h.type === 'generated'));
      } finally {
        setLoadingList(false);
      }
    };
    fetchSaved();
    // Generate initial password
    const pw = generatePassword(16, { upper: true, lower: true, digits: true, symbols: false });
    setPassword(pw);
    setDisplayPw(pw);
  }, []);

  const runScramble = (target) => {
    let frame = 0;
    const totalFrames = 14;
    clearInterval(scrambleRef.current);
    scrambleRef.current = setInterval(() => {
      frame++;
      if (frame >= totalFrames) {
        clearInterval(scrambleRef.current);
        setDisplayPw(target);
        return;
      }
      const revealCount = Math.floor((frame / totalFrames) * target.length);
      const scrambled = target
        .split('')
        .map((ch, i) =>
          i < revealCount
            ? ch
            : SCRAMBLE_POOL[Math.floor(Math.random() * SCRAMBLE_POOL.length)]
        )
        .join('');
      setDisplayPw(scrambled);
    }, 40);
  };

  const generate = () => {
    const pw = generatePassword(length, options);
    setPassword(pw);
    runScramble(pw);
    setCopied(false);
    setSaved(false);
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const save = async () => {
    await api.post('/history', {
      type: 'generated',
      input: null,
      result: { password, length, options, name: label.trim() || null },
    });
    setSaved(true);
    setLabel('');
    setTimeout(() => setSaved(false), 2000);
    const { data } = await api.get('/history');
    setSavedList(data.filter((h) => h.type === 'generated'));
  };

  const handleDelete = async (id) => {
    await api.delete(`/history/${id}`);
    setSavedList((prev) => prev.filter((h) => h._id !== id));
  };

  return (
    <main className="page generator-page">
      <h2>Password Generator</h2>
      <p className="muted">
        Passwords are generated using <code>window.crypto.getRandomValues()</code> — cryptographically secure.
      </p>
      <div className="generator-controls">
        <label className="range-label">
          Length: <strong>{length}</strong>
          <input
            type="range"
            min={8}
            max={64}
            value={length}
            onChange={(e) => setLength(+e.target.value)}
          />
        </label>
        <div className="checkbox-group">
          {Object.entries({ upper: 'Uppercase', lower: 'Lowercase', digits: 'Numbers', symbols: 'Symbols' }).map(
            ([key, lbl]) => (
              <label key={key} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={options[key]}
                  onChange={(e) => setOptions({ ...options, [key]: e.target.checked })}
                />
                {lbl}
              </label>
            )
          )}
        </div>
        <button className="btn-primary" onClick={generate} disabled={!anySelected}>
          Generate
        </button>
      </div>

      {displayPw && (
        <div className="generated-password">
          <code className="password-output">{displayPw}</code>
          <div className="password-actions">
            <button className="btn-secondary" onClick={() => copy(password)}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="save-row">
            <input
              type="text"
              className="label-input"
              placeholder="Label (e.g. Gmail, Netflix)..."
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={40}
            />
            <button className="btn-primary" onClick={save} disabled={saved || !anySelected}>
              {saved ? 'Saved!' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="saved-passwords">
        <h3>Saved Passwords</h3>
        {loadingList ? (
          <Spinner />
        ) : savedList.length === 0 ? (
          <p className="muted">No saved passwords yet.</p>
        ) : (
          savedList.map((entry) => (
            <div key={entry._id} className="saved-password-item">
              <div className="saved-password-info">
                {entry.result?.name && (
                  <span className="saved-password-label">{entry.result.name}</span>
                )}
                <code>{entry.result?.password ?? '—'}</code>
              </div>
              <div className="saved-password-actions">
                <span className="saved-password-meta">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </span>
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
