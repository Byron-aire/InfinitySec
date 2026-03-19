import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FULL_TEXT = 'Your infinite barrier against the digital world — become untouchable.';

const AI_FEATURES = [
  { path: '/six-eyes',        title: 'Six Eyes',            desc: 'Streaming AI security assistant. Answers questions with context from your security posture.' },
  { path: '/domain-strength', title: 'Domain Strength',     desc: 'AI-synthesised domain analysis — SSL, headers, RDAP, Safe Browsing → score 0–100 with grade.' },
  { path: '/briefing',        title: 'The Briefing',        desc: 'Weekly AI security digest emailed every Monday — personalised breach status and top headlines.' },
  { path: '/phishing',        title: 'Phishing Analyser',   desc: 'Paste or screenshot a suspicious email or SMS. AI identifies phishing tactics and flags links.' },
  { path: '/supply-chain',    title: 'Supply Chain Scanner',desc: 'Paste your package.json. AI flags typosquatting, abandoned packages, and risky version pins.' },
  { path: '/mfa-fatigue',     title: 'MFA Fatigue Checker', desc: 'Rate your 2FA methods against fatigue attacks. Get a 0–100 posture score and upgrade advice.' },
];

const FEATURES = [
  { path: '/checker',     title: 'Password Checker',   desc: 'Live strength analysis — 0–100 score, criteria breakdown. Runs entirely in your browser.' },
  { path: '/breach',      title: 'Breach Checker',     desc: 'Check your email against HaveIBeenPwned. Your email is never stored.' },
  { path: '/generator',   title: 'Password Generator', desc: 'Cryptographically secure. Configurable length, character sets, save with a custom label.' },
  { path: '/barrier',     title: 'The Barrier — 2FA',  desc: 'Track 2FA status across 27 platforms. App beats SMS. Hardware beats everything.' },
  { path: '/ssl',         title: 'SSL Checker',        desc: 'Inspect any domain\'s certificate — expiry, issuer, validity. Colour-coded.' },
  { path: '/convergence', title: 'Convergence',        desc: 'Scan any URL for malware and phishing via Google Safe Browsing. Server-side only.' },
  { path: '/voidwatch',   title: 'Void Watch',         desc: 'Weekly automated breach monitoring. Get emailed if your data surfaces anywhere.' },
  { path: '/tips',        title: 'Security Tips',      desc: '56 expert tips across Passwords, Phishing, Privacy, AI, Network, and Devices. Live RSS feed.' },
];

export default function HomePage() {
  const { user } = useAuth();
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const heroRef = useRef(null);
  const orb1Ref = useRef(null);
  const orb2Ref = useRef(null);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(FULL_TEXT.slice(0, i));
      if (i >= FULL_TEXT.length) { clearInterval(interval); setDone(true); }
    }, 22);
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
    const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
    if (orb1Ref.current) orb1Ref.current.style.transform = `translate(${x * 40}px, ${y * 30}px)`;
    if (orb2Ref.current) orb2Ref.current.style.transform = `translate(${x * -30}px, ${y * -25}px)`;
  }, []);

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <main className="page home-page">
      <div className="hero" ref={heroRef} onMouseMove={handleMouseMove}>
        <div className="hero-orb hero-orb-1" ref={orb1Ref} />
        <div className="hero-orb hero-orb-2" ref={orb2Ref} />

        <h1>InfinitySec</h1>
        <p className="hero-sub">
          {displayed}
          {!done && <span className="hero-cursor">|</span>}
        </p>
        <div className="cta">
          <Link to="/register" className="btn-primary">Get Started</Link>
          <Link to="/login" className="btn-secondary">Sign In</Link>
        </div>
      </div>

      <div className="home-section-label">AI-Powered</div>
      <div className="feature-grid">
        {AI_FEATURES.map((f, i) => (
          <Link
            key={f.path}
            to={f.path}
            className="feature-card feature-card--ai"
            style={{ animationDelay: `${0.05 * i}s` }}
          >
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </Link>
        ))}
      </div>

      <div className="home-section-label" style={{ marginTop: '2rem' }}>Tools</div>
      <div className="feature-grid">
        {FEATURES.map((f, i) => (
          <Link
            key={f.path}
            to={f.path}
            className="feature-card"
            style={{ animationDelay: `${0.05 * (i + AI_FEATURES.length)}s` }}
          >
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
