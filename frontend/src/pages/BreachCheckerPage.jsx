import { useState } from 'react';
import api from '../utils/api';
import ErrorMessage from '../components/ErrorMessage';
import Spinner from '../components/Spinner';

export default function BreachCheckerPage() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
          {loading ? <Spinner /> : 'Check Now'}
        </button>
      </form>
      <ErrorMessage message={error} />
      {result && (
        <div className={`breach-result ${result.breached ? 'breached' : 'safe'}`}>
          {result.breached ? (
            <>
              <h3 style={{ color: 'var(--color-danger)' }}>
                Breached — found in {result.count} site(s)
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
            <h3 style={{ color: 'var(--color-safe)' }}>No breaches found</h3>
          )}
        </div>
      )}
    </main>
  );
}
