import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function VoidWatchPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/voidwatch/status')
      .then(({ data }) => setStatus(data))
      .catch(() => setError('Could not load monitoring status.'))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async () => {
    setToggling(true);
    setError('');
    try {
      const { data } = await api.post('/voidwatch/toggle');
      setStatus(prev => ({ ...prev, ...data }));
    } catch {
      setError('Could not update monitoring status. Try again.');
    } finally {
      setToggling(false);
    }
  };

  return (
    <main className="page voidwatch-page">
      <h2>Void Watch</h2>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        Automatic weekly breach monitoring. InfinitySec checks your email against the HaveIBeenPwned database every Monday at 8am and emails you if new breaches are found.
      </p>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
          <Spinner />
        </div>
      )}

      {error && <ErrorMessage message={error} />}

      {status && (
        <>
          <div className={`voidwatch-status-card${status.enabled ? ' voidwatch-status-card--active' : ''}`}>
            <div className="voidwatch-status-row">
              <div>
                <div className="voidwatch-status-label">Status</div>
                <div className="voidwatch-status-value" style={{ color: status.enabled ? 'var(--color-safe)' : 'var(--color-muted)' }}>
                  {status.enabled ? 'Active' : 'Inactive'}
                </div>
              </div>
              <div className={`voidwatch-indicator${status.enabled ? ' voidwatch-indicator--on' : ''}`} />
            </div>

            <div className="voidwatch-detail-row">
              <div className="voidwatch-field">
                <span className="voidwatch-field-label">Monitoring email</span>
                <span>{user?.email || status.email}</span>
              </div>
              {status.enabled && status.subscribedAt && (
                <div className="voidwatch-field">
                  <span className="voidwatch-field-label">Active since</span>
                  <span>{formatDate(status.subscribedAt)}</span>
                </div>
              )}
              <div className="voidwatch-field">
                <span className="voidwatch-field-label">Scan schedule</span>
                <span>Every Monday at 08:00</span>
              </div>
            </div>

            <button
              className={status.enabled ? 'btn-secondary' : 'btn-primary'}
              onClick={handleToggle}
              disabled={toggling}
              style={{ marginTop: '0.5rem' }}
            >
              {toggling ? 'Updating…' : status.enabled ? 'Disable monitoring' : 'Enable monitoring'}
            </button>
          </div>

          <div className="voidwatch-info-grid">
            <div className="voidwatch-info-card">
              <h4>What we check</h4>
              <p>Your registered email address against the HaveIBeenPwned breach database — the same check as the manual Breach Checker.</p>
            </div>
            <div className="voidwatch-info-card">
              <h4>What we send</h4>
              <p>Only an alert email when breaches are found. No marketing, no tracking. If nothing is found, you hear nothing.</p>
            </div>
            <div className="voidwatch-info-card">
              <h4>What we store</h4>
              <p>Only your subscription status and the date you subscribed. Your email is never logged or stored in any scan results.</p>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
