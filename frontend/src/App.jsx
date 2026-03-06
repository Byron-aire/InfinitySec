import { Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
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
  return (
    <>
      <Navbar />
      <div style={{ flex: 1 }}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/tips" element={<TipsPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/checker" element={<PasswordCheckerPage />} />
          <Route path="/breach" element={<BreachCheckerPage />} />
          <Route path="/generator" element={<GeneratorPage />} />
          <Route path="/barrier" element={<TwoFAPage />} />
          <Route path="/ssl" element={<SSLCheckerPage />} />
          <Route path="/convergence" element={<ConvergencePage />} />
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
    </>
  );
}
