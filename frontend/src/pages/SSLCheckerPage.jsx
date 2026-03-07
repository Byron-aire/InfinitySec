import { useState } from 'react';
import api from '../utils/api';
import Reveal from '../components/Reveal';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function DaysLabel({ days, valid }) {
  if (!valid) return <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Invalid / Expired</span>;
  if (days <= 7)  return <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>{days}d remaining — renew now</span>;
  if (days <= 30) return <span style={{ color: 'var(--color-fair)',   fontWeight: 600 }}>{days}d remaining — renew soon</span>;
  return <span style={{ color: 'var(--color-safe)', fontWeight: 600 }}>{days}d remaining</span>;
}

function LifetimeBar({ validFrom, validTo, daysRemaining, valid }) {
  if (!validFrom || !validTo) return null;
  const start = new Date(validFrom).getTime();
  const end   = new Date(validTo).getTime();
  const total = end - start;
  if (total <= 0) return null;
  const pct   = Math.max(0, Math.min(100, (daysRemaining / (total / 86400000)) * 100));
  const color = !valid || daysRemaining <= 7 ? 'var(--color-danger)'
              : daysRemaining <= 30           ? 'var(--color-fair)'
              : 'var(--color-safe)';
  return (
    <div className="ssl-lifetime-bar-wrap">
      <div className="ssl-lifetime-bar-label">
        <span>Cert lifetime remaining</span>
        <span style={{ color }}>{Math.round(pct)}%</span>
      </div>
      <div className="ssl-lifetime-bar-track">
        <div
          className="ssl-lifetime-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

export default function SSLCheckerPage() {
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clean = domain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
    if (!clean) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await api.post('/ssl/check', { domain: clean });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const statusColor = result
    ? result.valid && result.daysRemaining > 30
      ? 'var(--color-safe)'
      : result.valid && result.daysRemaining > 7
        ? 'var(--color-fair)'
        : 'var(--color-danger)'
    : null;

  return (
    <main className="page ssl-page">
      <h2>SSL Checker</h2>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        Inspect the SSL/TLS certificate for any domain — expiry date, issuer, and validity status.
      </p>

      <form className="ssl-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="ssl-input"
          placeholder="example.com"
          value={domain}
          onChange={e => setDomain(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <button className="btn-primary" type="submit" disabled={loading || !domain.trim()}>
          {loading ? 'Checking…' : 'Check'}
        </button>
      </form>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
          <Spinner />
        </div>
      )}

      {error && <ErrorMessage message={error} />}

      {result && (
        <Reveal>
          <div className="ssl-result" style={{ borderColor: statusColor }}>
            <div className="ssl-result-header">
              <span className="ssl-domain">{result.domain}</span>
              <span
                className="ssl-status-badge"
                style={{ background: `${statusColor}1a`, color: statusColor, border: `1px solid ${statusColor}55` }}
              >
                {result.valid ? 'Valid' : 'Invalid'}
              </span>
            </div>

            <LifetimeBar
              validFrom={result.validFrom}
              validTo={result.validTo}
              daysRemaining={result.daysRemaining}
              valid={result.valid}
            />

            <div className="ssl-grid" style={{ marginTop: '1.25rem' }}>
              <div className="ssl-field">
                <span className="ssl-field-label">Days Remaining</span>
                <DaysLabel days={result.daysRemaining} valid={result.valid} />
              </div>
              <div className="ssl-field">
                <span className="ssl-field-label">Expires</span>
                <span>{formatDate(result.validTo)}</span>
              </div>
              <div className="ssl-field">
                <span className="ssl-field-label">Issued</span>
                <span>{formatDate(result.validFrom)}</span>
              </div>
              <div className="ssl-field">
                <span className="ssl-field-label">Issuer</span>
                <span>{result.issuer || '—'}</span>
              </div>
            </div>
          </div>
        </Reveal>
      )}
    </main>
  );
}
