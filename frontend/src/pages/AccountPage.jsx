import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AccountPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.get('/auth/account-summary')
      .then(({ data }) => setSummary(data))
      .catch(() => setError('Could not load account data.'))
      .finally(() => setLoading(false));
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data } = await api.get('/auth/export');
      downloadJSON(data, `infinitysec-export-${Date.now()}.json`);
    } catch {
      setError('Export failed. Try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="page account-page">
      <h2>Privacy Dashboard</h2>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        A full picture of everything InfinitySec holds about your account — and the tools to act on it.
      </p>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
          <Spinner />
        </div>
      )}
      {error && <ErrorMessage message={error} />}

      {summary && (
        <>
          {/* Account */}
          <section className="account-section">
            <h3 className="account-section-title">Account</h3>
            <div className="account-fields">
              <div className="account-field">
                <span className="account-field-label">Username</span>
                <span>{summary.account.username}</span>
              </div>
              <div className="account-field">
                <span className="account-field-label">Email</span>
                <span>{summary.account.email}</span>
              </div>
              <div className="account-field">
                <span className="account-field-label">Member since</span>
                <span>{formatDate(summary.account.createdAt)}</span>
              </div>
            </div>
          </section>

          {/* Data we hold */}
          <section className="account-section">
            <h3 className="account-section-title">Data we hold</h3>
            <div className="account-data-grid">
              <div className="account-data-card">
                <span className="account-data-value">{summary.history.total}</span>
                <span className="account-data-label">History entries</span>
                <div className="account-data-breakdown">
                  <span>{summary.history.strength} strength checks</span>
                  <span>{summary.history.breach} breach checks</span>
                  <span>{summary.history.generated} passwords saved</span>
                </div>
              </div>
              <div className="account-data-card">
                <span className="account-data-value">{summary.sessions.count}</span>
                <span className="account-data-label">Sessions stored</span>
                <div className="account-data-breakdown">
                  <span>Last login: {formatDate(summary.sessions.lastLogin)}</span>
                  <span>Max stored: 10</span>
                </div>
              </div>
              <div className="account-data-card">
                <span
                  className="account-data-value"
                  style={{ color: summary.monitoring.enabled ? 'var(--color-safe)' : 'var(--color-muted)' }}
                >
                  {summary.monitoring.enabled ? 'On' : 'Off'}
                </span>
                <span className="account-data-label">Void Watch</span>
                <div className="account-data-breakdown">
                  {summary.monitoring.enabled
                    ? <span>Since {formatDate(summary.monitoring.subscribedAt)}</span>
                    : <span>Not subscribed</span>
                  }
                </div>
              </div>
            </div>
          </section>

          {/* What we don't store */}
          <section className="account-section">
            <h3 className="account-section-title">What we never store</h3>
            <ul className="account-nostore-list">
              <li>Raw passwords — strength checks run entirely in your browser</li>
              <li>Your email address in breach check results — only the anonymised outcome is saved</li>
              <li>Payment information — there is no payment system</li>
              <li>Analytics, tracking cookies, or third-party data</li>
            </ul>
          </section>

          {/* Your rights */}
          <section className="account-section">
            <h3 className="account-section-title">Your rights</h3>
            <div className="account-rights-row">
              <div className="account-right-card">
                <h4>Export your data</h4>
                <p>Download a full copy of your account and history as JSON.</p>
                <button className="btn-secondary" onClick={handleExport} disabled={exporting} style={{ marginTop: '0.75rem' }}>
                  {exporting ? 'Exporting…' : 'Download JSON'}
                </button>
              </div>
              <div className="account-right-card">
                <h4>Manage sessions</h4>
                <p>View every active session and revoke all tokens instantly.</p>
                <Link to="/sessions" className="btn-secondary" style={{ marginTop: '0.75rem', display: 'inline-flex' }}>
                  Go to Sessions
                </Link>
              </div>
              <div className="account-right-card">
                <h4>Delete account</h4>
                <p>Permanently delete your account and all associated data.</p>
                <Link to="/dashboard" className="btn-danger-sm" style={{ marginTop: '0.75rem', display: 'inline-flex', fontSize: '0.85rem', padding: '0.45rem 0.9rem' }}>
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
