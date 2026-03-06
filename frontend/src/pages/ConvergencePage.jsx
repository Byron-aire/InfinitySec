import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import ErrorMessage from '../components/ErrorMessage';

const SCAN_MESSAGES = [
  'Resolving domain…',
  'Querying Safe Browsing database…',
  'Checking malware signatures…',
  'Checking phishing indicators…',
  'Analysing threat patterns…',
  'Finalising report…',
];

function normaliseURL(raw) {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export default function ConvergencePage() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanMsg, setScanMsg] = useState(SCAN_MESSAGES[0]);
  const scanRef = useRef(null);

  useEffect(() => {
    if (loading) {
      let i = 0;
      scanRef.current = setInterval(() => {
        i = (i + 1) % SCAN_MESSAGES.length;
        setScanMsg(SCAN_MESSAGES[i]);
      }, 700);
    } else {
      clearInterval(scanRef.current);
      setScanMsg(SCAN_MESSAGES[0]);
    }
    return () => clearInterval(scanRef.current);
  }, [loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await api.post('/convergence/check', { url: normaliseURL(url) });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Scan failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page convergence-page">
      <h2>Convergence</h2>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        Scan any URL for malware, phishing, and unwanted software using Google Safe Browsing. The URL is checked server-side — never exposed in your browser.
      </p>

      <form className="convergence-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="convergence-input"
          placeholder="https://example.com"
          value={url}
          onChange={e => setUrl(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <button className="btn-primary" type="submit" disabled={loading || !url.trim()}>
          {loading ? 'Scanning…' : 'Scan'}
        </button>
      </form>

      {loading && (
        <div className="scan-display">
          <div className="scan-line">
            <span style={{ color: 'var(--color-muted)' }}>&gt;</span>
            <span>{scanMsg}</span>
            <span className="scan-cursor">_</span>
          </div>
        </div>
      )}

      {error && <ErrorMessage message={error} />}

      {result && (
        <div className={`convergence-result ${result.safe ? 'convergence-result--safe' : 'convergence-result--threat'}`}>
          <div className="convergence-result-header">
            <span
              className="convergence-status-badge"
              style={result.safe
                ? { background: 'rgba(34,197,94,0.1)',  color: 'var(--color-safe)',   border: '1px solid rgba(34,197,94,0.35)' }
                : { background: 'rgba(239,68,68,0.1)',  color: 'var(--color-danger)', border: '1px solid rgba(239,68,68,0.35)' }
              }
            >
              {result.safe ? 'Clean' : 'Threat Detected'}
            </span>
            <span className="convergence-url">{result.url}</span>
          </div>

          {result.safe ? (
            <p className="convergence-safe-msg">
              No threats found. Google Safe Browsing found no malware, phishing, or unwanted software associated with this URL.
            </p>
          ) : (
            <div className="convergence-threats">
              <p style={{ color: 'var(--color-danger)', marginBottom: '0.75rem', fontWeight: 600 }}>
                Do not visit this URL.
              </p>
              <ul className="convergence-threat-list">
                {result.threats.map(t => (
                  <li key={t.type} className="convergence-threat-item">
                    <span className="convergence-threat-dot" />
                    {t.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
