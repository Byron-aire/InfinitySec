import { useState, useEffect } from 'react';
import api from '../utils/api';
import Spinner from '../components/Spinner';

const CHARS = {
  upper:   'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower:   'abcdefghijklmnopqrstuvwxyz',
  digits:  '0123456789',
  symbols: '!@#$%^&*()-_=+[]{}|;:,.<>?',
};

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
  const [password, setPassword] = useState(() => generatePassword(16, { upper: true, lower: true, digits: true, symbols: false }));
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedList, setSavedList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

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
  }, []);

  const generate = () => {
    setPassword(generatePassword(length, options));
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
      result: { password, length, options },
    });
    setSaved(true);
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
            ([key, label]) => (
              <label key={key} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={options[key]}
                  onChange={(e) => setOptions({ ...options, [key]: e.target.checked })}
                />
                {label}
              </label>
            )
          )}
        </div>
        <button className="btn-primary" onClick={generate} disabled={!anySelected}>
          Generate
        </button>
      </div>

      {password && (
        <div className="generated-password">
          <code className="password-output">{password}</code>
          <div className="password-actions">
            <button className="btn-secondary" onClick={() => copy(password)}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button className="btn-primary" onClick={save} disabled={saved || !anySelected}>
              {saved ? 'Saved!' : 'Save to History'}
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
              <code>{entry.result?.password ?? '—'}</code>
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
          ))
        )}
      </div>
    </main>
  );
}
