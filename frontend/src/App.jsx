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
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
