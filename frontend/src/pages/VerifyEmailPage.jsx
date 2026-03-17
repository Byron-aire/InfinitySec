import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import Spinner from '../components/Spinner';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token found. Check the link in your email.');
      return;
    }
    api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(({ data }) => {
        setStatus('success');
        setMessage(data.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed. The link may have expired.');
      });
  }, [searchParams]);

  return (
    <main className="page auth-page">
      <div className="auth-form" style={{ textAlign: 'center' }}>
        {status === 'loading' && (
          <>
            <h2>Verifying…</h2>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '1.5rem 0' }}>
              <Spinner />
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <h2 style={{ color: 'var(--color-safe)' }}>Email verified</h2>
            <p style={{ color: 'var(--color-muted)', margin: '1rem 0 1.5rem' }}>{message}</p>
            <Link to="/login" className="btn-primary" style={{ display: 'inline-block' }}>
              Sign In
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <h2 style={{ color: 'var(--color-danger)' }}>Verification failed</h2>
            <p style={{ color: 'var(--color-muted)', margin: '1rem 0 1.5rem' }}>{message}</p>
            <Link to="/login" className="btn-secondary" style={{ display: 'inline-block' }}>
              Back to Sign In
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
