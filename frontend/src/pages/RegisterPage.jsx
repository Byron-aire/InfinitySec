import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import ErrorMessage from '../components/ErrorMessage';
import Spinner from '../components/Spinner';

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyPrompt, setVerifyPrompt] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.email || !form.password) {
      setError('All fields are required');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/register', form);
      if (data.token) {
        // SMTP not configured — auto-verified, log in immediately
        login(data.token, data.user);
        navigate('/dashboard');
      } else {
        // Email verification required
        setVerifyPrompt(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (verifyPrompt) {
    return (
      <main className="page auth-page">
        <div className="auth-form" style={{ textAlign: 'center' }}>
          <h2>Check your inbox</h2>
          <p style={{ color: 'var(--color-muted)', margin: '1rem 0' }}>
            We sent a verification link to <strong>{form.email}</strong>.
            Click it to activate your account, then sign in.
          </p>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            The link expires in 24 hours.
          </p>
          <Link to="/login" className="btn-primary" style={{ display: 'inline-block' }}>
            Go to Sign In
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Create Account</h2>
        <ErrorMessage message={error} />
        <input
          type="text"
          placeholder="Username (3–30 chars, letters/numbers/_/-)"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          type="password"
          placeholder="Password (min 8 chars, upper + lower + number)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? <Spinner /> : 'Create Account'}
        </button>
        <p>
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </form>
    </main>
  );
}
