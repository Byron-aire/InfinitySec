import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import ErrorMessage from '../components/ErrorMessage';
import Spinner from '../components/Spinner';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const token = searchParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || !confirm) {
      setError('Both fields are required');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <main className="page auth-page">
        <div className="auth-form" style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--color-danger)' }}>Invalid link</h2>
          <p style={{ color: 'var(--color-muted)', margin: '1rem 0 1.5rem' }}>
            No reset token found. Use the link from your email.
          </p>
          <Link to="/forgot-password" className="btn-secondary" style={{ display: 'inline-block' }}>
            Request a new link
          </Link>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main className="page auth-page">
        <div className="auth-form" style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--color-safe)' }}>Password reset</h2>
          <p style={{ color: 'var(--color-muted)', margin: '1rem 0' }}>
            Your password has been updated. All other sessions have been signed out.
          </p>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Redirecting to sign in…
          </p>
          <Link to="/login" className="btn-primary" style={{ display: 'inline-block' }}>
            Sign In now
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Set New Password</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Minimum 8 characters with at least one uppercase letter, lowercase letter, and number.
        </p>
        <ErrorMessage message={error} />
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? <Spinner /> : 'Reset Password'}
        </button>
      </form>
    </main>
  );
}
