import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import Reveal from '../components/Reveal';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import TrustBadge from '../components/TrustBadge';

export default function BriefingPage() {
  const [status, setStatus]     = useState(null); // null = loading
  const [toggling, setToggling] = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    api.get('/briefing/status')
      .then(({ data }) => setStatus(data))
      .catch(() => setError('Could not load briefing status.'));
  }, []);

  const handleToggle = async () => {
    setToggling(true);
    setError('');
    try {
      const { data } = await api.post('/briefing/toggle');
      setStatus(prev => ({ ...prev, enabled: data.enabled }));
    } catch (err) {
      const msg = err.response?.data?.message || 'Toggle failed. Please try again.';
      if (err.response?.status === 403) {
        setError('AI consent required. Enable AI features in Six Eyes first.');
      } else {
        setError(msg);
      }
    } finally {
      setToggling(false);
    }
  };

  const noConsent = status && !status.aiConsent;

  return (
    <main className="page briefing-page">
      <h2>The Briefing</h2>
      <TrustBadge badges={['AI-generated digest', 'Claude Haiku', 'Every Monday 08:30']} />
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        A personalised weekly security email — breach status, top security news, and one concrete action —
        written by AI and delivered every Monday morning.
      </p>

      {!status && !error && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
          <Spinner />
        </div>
      )}

      <ErrorMessage message={error} />

      {status && (
        <>
          <Reveal>
            <div className={`briefing-card${status.enabled ? ' briefing-card--active' : ''}`}>
              <div className="briefing-status-row">
                <div>
                  <p className="briefing-status-label">Status</p>
                  <p className="briefing-status-value" style={{ color: status.enabled ? 'var(--color-safe)' : 'var(--color-muted)' }}>
                    {status.enabled ? 'Active — delivering every Monday' : 'Inactive'}
                  </p>
                </div>
                <div className={`briefing-indicator${status.enabled ? ' briefing-indicator--on' : ''}`} />
              </div>

              {noConsent ? (
                <div className="briefing-consent-gate">
                  <p className="briefing-consent-text">
                    The Briefing uses Claude to generate your digest. AI consent is required.
                  </p>
                  <Link to="/six-eyes" className="btn-primary" style={{ fontSize: '0.875rem', padding: '0.5rem 1.1rem' }}>
                    Enable AI features →
                  </Link>
                </div>
              ) : (
                <button
                  className={status.enabled ? 'btn-danger-sm' : 'btn-primary'}
                  style={{ marginTop: '1rem', fontSize: '0.875rem' }}
                  onClick={handleToggle}
                  disabled={toggling}
                >
                  {toggling
                    ? 'Updating…'
                    : status.enabled
                      ? 'Unsubscribe'
                      : 'Subscribe to The Briefing'
                  }
                </button>
              )}
            </div>
          </Reveal>

          <Reveal delay={60}>
            <div className="briefing-about">
              <h3 className="briefing-about-title">What you&apos;ll receive</h3>
              <div className="briefing-about-grid">
                <div className="briefing-about-item">
                  <span className="briefing-about-icon">🔍</span>
                  <div>
                    <p className="briefing-about-name">Breach Status</p>
                    <p className="briefing-about-desc">Whether your email appears in any known breaches this week</p>
                  </div>
                </div>
                <div className="briefing-about-item">
                  <span className="briefing-about-icon">📰</span>
                  <div>
                    <p className="briefing-about-name">Security News</p>
                    <p className="briefing-about-desc">Top stories from The Hacker News, synthesised into a 3-sentence update</p>
                  </div>
                </div>
                <div className="briefing-about-item">
                  <span className="briefing-about-icon">→</span>
                  <div>
                    <p className="briefing-about-name">This Week&apos;s Action</p>
                    <p className="briefing-about-desc">One concrete security step tailored to your current exposure</p>
                  </div>
                </div>
              </div>
              <p className="briefing-about-note">
                Separate from{' '}
                <Link to="/voidwatch">Void Watch</Link> — The Briefing always sends,
                Void Watch only alerts on new breaches. You can use both independently.
              </p>
            </div>
          </Reveal>
        </>
      )}
    </main>
  );
}
