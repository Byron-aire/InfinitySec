import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [passkeys, setPasskeys] = useState([]);
  const [passkeyError, setPasskeyError] = useState('');
  const [registeringPasskey, setRegisteringPasskey] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    api.get('/auth/account-summary')
      .then(({ data }) => setSummary(data))
      .catch(() => setError('Could not load account data.'))
      .finally(() => setLoading(false));

    api.get('/auth/passkeys')
      .then(({ data }) => setPasskeys(data.passkeys || []))
      .catch(() => {});
  }, []);

  const handleWithdrawConsent = async () => {
    if (!window.confirm('Withdraw AI consent? Six Eyes will be disabled until you accept again.')) return;
    setWithdrawing(true);
    try {
      await api.delete('/six-eyes/consent');
      setSummary(prev => ({ ...prev, aiConsent: { accepted: false, acceptedAt: null } }));
    } catch {
      setError('Failed to withdraw consent.');
    } finally {
      setWithdrawing(false);
    }
  };

  const handleRegisterPasskey = async () => {
    setPasskeyError('');
    setRegisteringPasskey(true);
    try {
      const { startRegistration } = await import('@simplewebauthn/browser');
      const deviceName = window.prompt('Name this passkey (e.g. MacBook, iPhone):') || 'Passkey';
      const { data: options } = await api.post('/auth/passkeys/register/options');
      const attResp = await startRegistration({ optionsJSON: options });
      await api.post('/auth/passkeys/register/verify', { ...attResp, deviceName });
      const { data } = await api.get('/auth/passkeys');
      setPasskeys(data.passkeys || []);
    } catch (err) {
      if (err?.name === 'NotAllowedError') {
        setPasskeyError('Passkey registration was cancelled.');
      } else {
        setPasskeyError(err.response?.data?.message || 'Passkey registration failed.');
      }
    } finally {
      setRegisteringPasskey(false);
    }
  };

  const handleRemovePasskey = async (id) => {
    if (!window.confirm('Remove this passkey?')) return;
    setRemovingId(id);
    try {
      await api.delete(`/auth/passkeys/${id}`);
      setPasskeys(prev => prev.filter(pk => pk._id !== id));
    } catch {
      setPasskeyError('Failed to remove passkey.');
    } finally {
      setRemovingId(null);
    }
  };

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

          {/* AI & Data */}
          <section className="account-section">
            <h3 className="account-section-title">AI & Data</h3>
            <div className="account-fields">
              <div className="account-field">
                <span className="account-field-label">Six Eyes consent</span>
                <span style={{ color: summary.aiConsent?.accepted ? 'var(--color-safe)' : 'var(--color-muted)' }}>
                  {summary.aiConsent?.accepted ? 'Granted' : 'Not given'}
                </span>
              </div>
              {summary.aiConsent?.accepted && (
                <div className="account-field">
                  <span className="account-field-label">Consent given</span>
                  <span>{formatDate(summary.aiConsent.acceptedAt)}</span>
                </div>
              )}
              <div className="account-field">
                <span className="account-field-label">The Briefing</span>
                <span style={{ color: summary.briefingEnabled ? 'var(--color-safe)' : 'var(--color-muted)' }}>
                  {summary.briefingEnabled ? 'Subscribed' : 'Not subscribed'}
                </span>
              </div>
            </div>
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link to="/six-eyes/log" className="btn-secondary" style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}>
                View AI audit log
              </Link>
              {summary.aiConsent?.accepted && (
                <button className="btn-danger-sm" onClick={handleWithdrawConsent} disabled={withdrawing} style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}>
                  {withdrawing ? 'Withdrawing…' : 'Withdraw AI consent'}
                </button>
              )}
            </div>
          </section>

          {/* Passkeys */}
          <section className="account-section">
            <h3 className="account-section-title">Passkeys</h3>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem', marginBottom: '1rem' }}>
              Sign in with Face ID, Touch ID, or a hardware key — no password needed.
            </p>
            {passkeyError && (
              <p style={{ color: 'var(--color-danger)', fontSize: '0.88rem', marginBottom: '0.75rem' }}>{passkeyError}</p>
            )}
            {passkeys.length > 0 ? (
              <div className="account-fields" style={{ marginBottom: '0.75rem' }}>
                {passkeys.map(pk => (
                  <div key={pk._id} className="account-field">
                    <span className="account-field-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 2a7 7 0 0 1 7 7c0 4.5-7 13-7 13S5 13.5 5 9a7 7 0 0 1 7-7z"/>
                        <circle cx="12" cy="9" r="2.5"/>
                      </svg>
                      {pk.deviceName}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ color: 'var(--color-muted)', fontSize: '0.82rem' }}>
                        {formatDate(pk.registeredAt)}
                      </span>
                      <button
                        className="btn-danger-sm"
                        onClick={() => handleRemovePasskey(pk._id)}
                        disabled={removingId === pk._id}
                        style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
                      >
                        {removingId === pk._id ? 'Removing…' : 'Remove'}
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem', marginBottom: '0.75rem' }}>
                No passkeys registered yet.
              </p>
            )}
            <button
              className="btn-secondary"
              onClick={handleRegisterPasskey}
              disabled={registeringPasskey}
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}
            >
              {registeringPasskey ? 'Waiting for authenticator…' : '+ Register a new passkey'}
            </button>
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
