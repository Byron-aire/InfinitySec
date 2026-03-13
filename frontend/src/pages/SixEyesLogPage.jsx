import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import Spinner from '../components/Spinner';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IE', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const FEATURE_LABELS = {
  'six-eyes':       'Six Eyes Chat',
  'domain-strength':'Domain Strength',
  'breach-impact':  'Cursed Intel',
  'briefing':       'The Briefing',
};

export default function SixEyesLogPage() {
  const [logs, setLogs]       = useState([]);
  const [consent, setConsent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    api.get('/six-eyes/log')
      .then(({ data }) => {
        setLogs(data.logs || []);
        setConsent(data.consent?.accepted || false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleWithdraw = async () => {
    if (!window.confirm('Withdraw AI consent? Six Eyes will be disabled until you accept again.')) return;
    setWithdrawing(true);
    try {
      await api.delete('/six-eyes/consent');
      setConsent(false);
    } catch {
      /* noop */
    } finally {
      setWithdrawing(false);
    }
  };

  const totalTokens = logs.reduce((a, l) => a + (l.inputTokens || 0) + (l.outputTokens || 0), 0);

  return (
    <main className="page six-eyes-log-page">
      <div className="six-eyes-header">
        <h2>AI Audit Log</h2>
        <Link to="/six-eyes" className="six-eyes-log-link muted">← Six Eyes</Link>
      </div>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        Every AI call made on your account. Prompts are stored as SHA-256 hashes only —
        we cannot read what you asked. This log is included in your data export.
      </p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
          <Spinner />
        </div>
      ) : (
        <>
          <div className="audit-summary-row">
            <div className="audit-summary-card">
              <span className="audit-summary-value">{logs.length}</span>
              <span className="audit-summary-label">Total AI calls</span>
            </div>
            <div className="audit-summary-card">
              <span className="audit-summary-value">{totalTokens.toLocaleString()}</span>
              <span className="audit-summary-label">Total tokens used</span>
            </div>
            <div className="audit-summary-card">
              <span className="audit-summary-value" style={{ color: consent ? 'var(--color-safe)' : 'var(--color-muted)' }}>
                {consent ? 'Active' : 'Withdrawn'}
              </span>
              <span className="audit-summary-label">AI consent</span>
            </div>
          </div>

          {logs.length === 0 ? (
            <p className="muted" style={{ marginTop: '1rem' }}>No AI calls recorded yet.</p>
          ) : (
            <div className="audit-log">
              {logs.map((entry, i) => (
                <div key={i} className="audit-log-entry">
                  <div className="audit-log-meta">
                    <span className="audit-log-feature">{FEATURE_LABELS[entry.feature] || entry.feature}</span>
                    <span className="audit-log-model muted">{entry.model}</span>
                  </div>
                  <div className="audit-log-detail">
                    <span className="muted" style={{ fontSize: '0.78rem' }}>{formatDate(entry.createdAt)}</span>
                    <span className="muted" style={{ fontSize: '0.78rem' }}>
                      {(entry.inputTokens || 0) + (entry.outputTokens || 0)} tokens
                    </span>
                    <span style={{ fontSize: '0.78rem', color: entry.success ? 'var(--color-safe)' : 'var(--color-danger)' }}>
                      {entry.success ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="audit-log-hash muted">
                    Hash: {entry.promptHash?.slice(0, 32)}…
                  </div>
                </div>
              ))}
            </div>
          )}

          {consent && (
            <div className="danger-zone" style={{ marginTop: '2.5rem' }}>
              <h3>Withdraw AI Consent</h3>
              <p className="muted" style={{ marginBottom: '1rem' }}>
                Disables Six Eyes and all AI features until you accept the consent again.
                Your audit log is retained as part of your account data.
              </p>
              <button className="btn-danger-sm" onClick={handleWithdraw} disabled={withdrawing}>
                {withdrawing ? 'Withdrawing…' : 'Withdraw consent'}
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
