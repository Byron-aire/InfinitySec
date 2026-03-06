import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <main className="page home-page">
      <div className="hero">
        <h1>InfinitySec</h1>
        <p className="hero-sub">
          Your infinite barrier against the digital world. Check passwords, detect breaches, generate uncrackable credentials — and become untouchable.
        </p>
        <div className="cta">
          <Link to="/register" className="btn-primary">Get Started</Link>
          <Link to="/login" className="btn-secondary">Sign In</Link>
        </div>
      </div>

      <div className="feature-grid">
        <Link to="/checker" className="feature-card">
          <h3>Password Checker</h3>
          <p>Analyse your password strength in real time — entirely client-side.</p>
        </Link>
        <Link to="/breach" className="feature-card">
          <h3>Breach Checker</h3>
          <p>Check if your email has appeared in a known data breach.</p>
        </Link>
        <Link to="/generator" className="feature-card">
          <h3>Password Generator</h3>
          <p>Generate cryptographically secure passwords with custom options.</p>
        </Link>
        <Link to="/tips" className="feature-card">
          <h3>Security Tips</h3>
          <p>Browse expert advice on passwords, phishing, and privacy.</p>
        </Link>
        <Link to="/barrier" className="feature-card">
          <h3>The Barrier — 2FA</h3>
          <p>Track which of your 27 accounts have two-factor authentication enabled.</p>
        </Link>
        <Link to="/ssl" className="feature-card">
          <h3>SSL Checker</h3>
          <p>Inspect any domain&apos;s SSL certificate — expiry, issuer, and validity.</p>
        </Link>
      </div>
    </main>
  );
}
