import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import ErrorMessage from '../components/ErrorMessage';
import Spinner from '../components/Spinner';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUnverified(false);
    setResendDone(false);
    if (!form.email || !form.password) {
      setError('Both fields are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'EMAIL_NOT_VERIFIED') {
        setUnverified(true);
        setError('');
      } else {
        setError(err.response?.data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await api.post('/auth/resend-verification', { email: form.email });
      setResendDone(true);
    } catch {
      setError('Could not resend verification email. Try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <main className="page auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Sign In</h2>
        <ErrorMessage message={error} />

        {unverified && (
          <div style={{
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid var(--color-accent)',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            marginBottom: '1rem',
          }}>
            <p style={{ color: 'var(--color-text)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              Your email address hasn&apos;t been verified yet.
            </p>
            {resendDone ? (
              <p style={{ color: 'var(--color-safe)', fontSize: '0.85rem' }}>
                Verification email sent — check your inbox.
              </p>
            ) : (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleResend}
                disabled={resendLoading}
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.8rem' }}
              >
                {resendLoading ? <Spinner /> : 'Resend verification email'}
              </button>
            )}
          </div>
        )}

        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? <Spinner /> : 'Sign In'}
        </button>
        <p>
          <Link to="/forgot-password" style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
            Forgot your password?
          </Link>
        </p>
        <p>
          Don&apos;t have an account? <Link to="/register">Register</Link>
        </p>
      </form>
    </main>
  );
}
