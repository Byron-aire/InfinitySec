import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import ErrorMessage from '../components/ErrorMessage';
import Spinner from '../components/Spinner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <main className="page auth-page">
        <div className="auth-form" style={{ textAlign: 'center' }}>
          <h2>Check your inbox</h2>
          <p style={{ color: 'var(--color-muted)', margin: '1rem 0 1.5rem' }}>
            If an account with that email exists, a password reset link has been sent.
            The link expires in 1 hour.
          </p>
          <Link to="/login" className="btn-secondary" style={{ display: 'inline-block' }}>
            Back to Sign In
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Reset Password</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Enter your email and we&apos;ll send a reset link if an account exists.
        </p>
        <ErrorMessage message={error} />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? <Spinner /> : 'Send Reset Link'}
        </button>
        <p>
          <Link to="/login" style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
            Back to Sign In
          </Link>
        </p>
      </form>
    </main>
  );
}
