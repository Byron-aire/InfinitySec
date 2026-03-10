import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';

function getCurrentJti() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.jti || null;
  } catch {
    return null;
  }
}

function formatUA(ua) {
  if (!ua || ua === 'unknown') return 'Unknown device';
  if (/mobile/i.test(ua)) {
    if (/iphone/i.test(ua))  return 'iPhone';
    if (/android/i.test(ua)) return 'Android';
    return 'Mobile device';
  }
  if (/chrome/i.test(ua) && !/edge|opr/i.test(ua)) return 'Chrome';
  if (/firefox/i.test(ua))                          return 'Firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua))   return 'Safari';
  if (/edg/i.test(ua))                              return 'Edge';
  return 'Browser';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IE', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function SessionsPage() {
  const { logout } = useAuth();
  const navigate   = useNavigate();
  const [sessions,  setSessions]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [revoking,  setRevoking]  = useState(false);
  const [revoking1, setRevoking1] = useState(null); // jti of single-session in progress

  const currentJti = getCurrentJti();

  useEffect(() => {
    api.get('/auth/sessions')
      .then(({ data }) => setSessions(data.sessions || []))
      .catch(() => setError('Could not load sessions.'))
      .finally(() => setLoading(false));
  }, []);

  const handleRevokeOne = async (jti) => {
    setRevoking1(jti);
    try {
      await api.delete(`/auth/sessions/${jti}`);
      setSessions(prev => prev.filter(s => s.jti !== jti));
    } catch {
      setError('Failed to revoke session. Try again.');
    } finally {
      setRevoking1(null);
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('This will sign you out of all devices immediately. Continue?')) return;
    setRevoking(true);
    try {
      await api.delete('/auth/sessions');
      logout();
      navigate('/login');
    } catch {
      setError('Failed to revoke sessions. Try again.');
      setRevoking(false);
    }
  };

  // Sort: current session first, then newest first
  const sorted = [...sessions].sort((a, b) => {
    if (a.jti === currentJti) return -1;
    if (b.jti === currentJti) return  1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <main className="page sessions-page">
      <h2>Active Sessions</h2>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        Every device currently signed into your account. Each entry is a live token —
        removing one signs that device out immediately.
      </p>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
          <Spinner />
        </div>
      )}

      {error && <ErrorMessage message={error} />}

      {!loading && sessions.length === 0 && !error && (
        <p className="muted">No active sessions found.</p>
      )}

      {sorted.length > 0 && (
        <ul className="sessions-list">
          {sorted.map((s) => {
            const isCurrent = s.jti === currentJti;
            return (
              <li key={s.jti} className={`sessions-item${isCurrent ? ' sessions-item--current' : ''}`}>
                <div className="sessions-meta">
                  <span className="sessions-device">{formatUA(s.userAgent)}</span>
                  {isCurrent && <span className="sessions-current-badge">this device</span>}
                </div>
                <div className="sessions-detail">
                  <span className="sessions-ip">{s.ip}</span>
                  <span className="sessions-date">{formatDate(s.createdAt)}</span>
                </div>
                {!isCurrent && (
                  <button
                    className="btn-danger-sm"
                    style={{ marginTop: '0.5rem', fontSize: '0.75rem', padding: '0.25rem 0.7rem' }}
                    disabled={revoking1 === s.jti}
                    onClick={() => handleRevokeOne(s.jti)}
                  >
                    {revoking1 === s.jti ? 'Revoking…' : 'Sign out'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="danger-zone" style={{ marginTop: '2.5rem' }}>
        <h3>Panic Button</h3>
        <p className="muted" style={{ marginBottom: '1rem' }}>
          Signs you out of every device immediately by invalidating all active tokens.
          Use this if your account may be compromised.
        </p>
        <button
          className="btn-danger-sm"
          onClick={handleLogoutAll}
          disabled={revoking}
          style={{ fontSize: '0.9rem', padding: '0.5rem 1.1rem' }}
        >
          {revoking ? 'Revoking…' : 'Sign out everywhere'}
        </button>
      </div>
    </main>
  );
}
