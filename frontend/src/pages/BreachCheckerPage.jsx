import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
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
      {result && (
        <div className={`breach-result ${result.breached ? 'breached' : 'safe'}`}>
          {result.breached ? (
            <>
              <h3 style={{ color: 'var(--color-danger)' }}>
                ⚠ Breached — found in {result.count} site{result.count !== 1 ? 's' : ''}
              </h3>
              <ul>
                {result.breaches.map((b) => (
                  <li key={b.Name}>
                    <strong>{b.Name}</strong> — {new Date(b.BreachDate).getFullYear()}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <h3 style={{ color: 'var(--color-safe)' }}>✓ No breaches found</h3>
          )}
        </div>
      )}
    </main>
  );
}
