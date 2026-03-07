import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import Reveal from '../components/Reveal';
import ErrorMessage from '../components/ErrorMessage';

const SCAN_MESSAGES = [
  'Initialising breach database connection...',
  'Querying HaveIBeenPwned API...',
  'Scanning 12 billion records...',
  'Cross-referencing breach datasets...',
  'Analysing exposure vectors...',
  'Compiling threat intelligence...',
];

export default function BreachCheckerPage() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanMsg, setScanMsg] = useState('');
  const scanRef = useRef(null);

  useEffect(() => {
    if (loading) {
      let i = 0;
      setScanMsg(SCAN_MESSAGES[0]);
      scanRef.current = setInterval(() => {
        i = (i + 1) % SCAN_MESSAGES.length;
        setScanMsg(SCAN_MESSAGES[i]);
      }, 700);
    } else {
      clearInterval(scanRef.current);
      setScanMsg('');
    }
    return () => clearInterval(scanRef.current);
  }, [loading]);

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await api.post('/breach/check', { email });
      setResult(data);
      await api.post('/history', {
        type: 'breach',
        input: null,
        result: { breached: data.breached, count: data.count },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Check failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page checker-page">
      <h2>Data Breach Checker</h2>
      <p className="muted">
        Check if your email has been exposed in a known data breach via HaveIBeenPwned.
      </p>
      <form onSubmit={handleCheck} className="breach-form">
        <input
          type="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Scanning...' : 'Check Now'}
        </button>
      </form>
      <ErrorMessage message={error} />

      {loading && (
        <div className="scan-display">
          <div className="scan-line">
            <span>{scanMsg}</span>
            <span className="scan-cursor">█</span>
          </div>
        </div>
      )}

      {result && !result.breached && (
        <Reveal>
          <div className="breach-result safe" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
            <div className="breach-result-safe-icon">✓</div>
            <div className="breach-result-safe-title">You&apos;re in the clear</div>
            <p className="breach-result-safe-sub">
              No breaches found for this email address in the HaveIBeenPwned database.
            </p>
          </div>
        </Reveal>
      )}

      {result && result.breached && (
        <Reveal>
          <div className="breach-result breached">
            <div style={{ marginBottom: '0.5rem' }}>
              <div className="breach-result-threat-count">{result.count}</div>
              <div className="breach-result-threat-label">
                breach{result.count !== 1 ? 'es' : ''} found
              </div>
            </div>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem', marginBottom: '0.25rem' }}>
              Your email was exposed in the following data breaches:
            </p>
            <ul className="breach-breach-list">
              {result.breaches.map((b) => (
                <li key={b.Name} className="breach-breach-item">
                  <span className="breach-breach-dot" />
                  <span className="breach-breach-name">{b.Name}</span>
                  <span className="breach-breach-year">{new Date(b.BreachDate).getFullYear()}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      )}
    </main>
  );
}
