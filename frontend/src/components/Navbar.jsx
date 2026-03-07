import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onOpenPalette }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); setMenuOpen(false); };
  const close = () => setMenuOpen(false);

  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand" onClick={close}>∞ InfinitySec</Link>

      <div className="navbar-center">
        <button className="cmd-trigger" onClick={onOpenPalette} aria-label="Open command palette">
          <span className="cmd-trigger-text">Search tools…</span>
          <kbd className="cmd-trigger-kbd">{isMac ? '⌘K' : 'Ctrl+K'}</kbd>
        </button>
      </div>

      <button
        className="navbar-hamburger"
        onClick={() => setMenuOpen(o => !o)}
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
      >
        {menuOpen ? '✕' : '☰'}
      </button>

      <div className={`navbar-links${menuOpen ? ' navbar-links--open' : ''}`}>
        <Link to="/tips" onClick={close}>Tips</Link>
        {user ? (
          <>
            <Link to="/dashboard" onClick={close}>Dashboard</Link>
            <Link to="/account" className="navbar-account-link" onClick={close} title="Privacy &amp; Account">
              <span className="navbar-account-avatar">{user.username?.[0]?.toUpperCase() || '?'}</span>
            </Link>
            <button
              className="cmd-trigger-mobile"
              onClick={() => { close(); onOpenPalette(); }}
            >
              All tools ⌘K
            </button>
            <Link to="/account" onClick={close}>Account &amp; Privacy</Link>
            <button onClick={handleLogout} className="btn-ghost">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" onClick={close}>Login</Link>
            <Link to="/register" className="btn-primary" onClick={close}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
