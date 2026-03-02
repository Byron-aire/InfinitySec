import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';

const TYPE_LABELS = {
  strength:  'Password Check',
  breach:    'Breach Check',
  generated: 'Generated',
};

function useCountUp(target, active) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active || target === 0) { setValue(target); return; }
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 20));
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      setValue(current);
      if (current >= target) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [target, active]);
  return value;
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await api.get('/history');
        setHistory(data);
      } catch {
        setError('Failed to load history');
      } finally {
        setLoading(false);
        // Slight delay so numbers animate in after cards appear
        setTimeout(() => setAnimating(true), 150);
      }
    };
    fetchHistory();
  }, []);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/history/${id}`);
      setHistory((prev) => prev.filter((h) => h._id !== id));
    } catch {
      setError('Failed to delete entry');
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'This will permanently delete your account and all your data. This cannot be undone.'
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      await api.delete('/auth/account');
      logout();
    } catch {
      setError('Failed to delete account. Please try again.');
      setDeleting(false);
    }
  };

  const counts = {
    strength:  history.filter((h) => h.type === 'strength').length,
    breach:    history.filter((h) => h.type === 'breach').length,
    generated: history.filter((h) => h.type === 'generated').length,
  };

  const strengthCount  = useCountUp(counts.strength,  animating);
  const breachCount    = useCountUp(counts.breach,     animating);
  const generatedCount = useCountUp(counts.generated,  animating);

  return (
    <main className="page dashboard-page">
      <h2>Welcome back, {user?.username}</h2>
      <ErrorMessage message={error} />
      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="stat-cards">
            <div className="stat-card">
              <span className="stat-value">{strengthCount}</span>
              <span className="stat-label">Strength Checks</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{breachCount}</span>
              <span className="stat-label">Breach Checks</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{generatedCount}</span>
              <span className="stat-label">Passwords Generated</span>
            </div>
          </div>

          <h3>Recent Activity</h3>
          {history.length === 0 ? (
            <p className="muted">No activity yet. Try checking a password!</p>
          ) : (
            <ul className="history-list">
              {history.slice(0, 5).map((entry) => (
                <li key={entry._id} className="history-item">
                  <div>
                    <span className={`badge badge-${entry.type}`}>{TYPE_LABELS[entry.type]}</span>
                    <span className="muted">{new Date(entry.createdAt).toLocaleDateString()}</span>
                  </div>
                  <button className="btn-danger-sm" onClick={() => handleDelete(entry._id)}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="danger-zone">
            <h3>Danger Zone</h3>
            <p className="muted">Permanently delete your account and all associated data.</p>
            <button className="btn-danger-sm" onClick={handleDeleteAccount} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
