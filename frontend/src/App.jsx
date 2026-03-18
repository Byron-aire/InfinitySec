import { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import CommandPalette from './components/CommandPalette';
import CustomCursor from './components/CustomCursor';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PasswordCheckerPage from './pages/PasswordCheckerPage';
import BreachCheckerPage from './pages/BreachCheckerPage';
import GeneratorPage from './pages/GeneratorPage';
import TipsPage from './pages/TipsPage';
import PrivacyPage from './pages/PrivacyPage';
import TwoFAPage from './pages/TwoFAPage';
import SSLCheckerPage from './pages/SSLCheckerPage';
import ConvergencePage from './pages/ConvergencePage';
import SessionsPage from './pages/SessionsPage';
import VoidWatchPage from './pages/VoidWatchPage';
import AccountPage from './pages/AccountPage';
import SixEyesPage from './pages/SixEyesPage';
import SixEyesLogPage from './pages/SixEyesLogPage';
import DomainStrengthPage from './pages/DomainStrengthPage';
import BriefingPage from './pages/BriefingPage';
import PhishingAnalyserPage from './pages/PhishingAnalyserPage';
import SupplyChainPage from './pages/SupplyChainPage';
import MFAFatiguePage from './pages/MFAFatiguePage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

function NotFoundPage() {
  return (
    <main className="page" style={{ textAlign: 'center', marginTop: '4rem' }}>
      <h2>404 — Page Not Found</h2>
      <p className="muted" style={{ margin: '1rem 0' }}>That page doesn&apos;t exist.</p>
      <Link to="/" className="btn-primary">Go Home</Link>
    </main>
  );
}

export default function App() {
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <CustomCursor />
      <Navbar onOpenPalette={() => setCmdOpen(true)} />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <div style={{ flex: 1 }}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/register"        element={<RegisterPage />} />
        <Route path="/verify-email"    element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />
        <Route path="/tips" element={<TipsPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/checker" element={<PasswordCheckerPage />} />
          <Route path="/breach" element={<BreachCheckerPage />} />
          <Route path="/generator" element={<GeneratorPage />} />
          <Route path="/barrier" element={<TwoFAPage />} />
          <Route path="/ssl" element={<SSLCheckerPage />} />
          <Route path="/convergence" element={<ConvergencePage />} />
          <Route path="/sessions"   element={<SessionsPage />} />
          <Route path="/voidwatch"  element={<VoidWatchPage />} />
          <Route path="/account"    element={<AccountPage />} />
          <Route path="/six-eyes"         element={<SixEyesPage />} />
          <Route path="/six-eyes/log"   element={<SixEyesLogPage />} />
          <Route path="/domain-strength" element={<DomainStrengthPage />} />
          <Route path="/briefing"        element={<BriefingPage />} />
          <Route path="/phishing"        element={<PhishingAnalyserPage />} />
          <Route path="/supply-chain"    element={<SupplyChainPage />} />
          <Route path="/mfa-fatigue"     element={<MFAFatiguePage />} />
        </Route>
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </div>
      <footer style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        textAlign: 'center',
        padding: '0.6rem 1rem',
        borderTop: '1px solid #1C1C1C',
        background: '#0A0A0A',
        zIndex: 99,
      }}>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.8rem' }}>
          © 2026 InfinitySec ·{' '}
          <Link to="/privacy" style={{ color: 'var(--color-muted)' }}>Privacy Policy</Link>
          {' '}· The S in IoT stands for Security.
        </p>
      </footer>
      <Analytics />
    </>
  );
}
