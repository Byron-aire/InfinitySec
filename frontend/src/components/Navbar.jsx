import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
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
      <Link to="/" className="navbar-brand" onClick={close}>
        <span className="navbar-brand-mark" aria-hidden="true"></span>
        <span className="navbar-brand-word">Byronaire<span className="navbar-brand-accent">Sec</span></span>
      </Link>

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
        <NavLink to="/tips" onClick={close}>Tips</NavLink>
        {user ? (
          <>
            <NavLink to="/dashboard" onClick={close}>Dashboard</NavLink>
            <NavLink to="/account" onClick={close}>Account</NavLink>
            <button
              className="cmd-trigger-mobile"
              onClick={() => { close(); onOpenPalette(); }}
            >
              All tools ⌘K
            </button>
            <button onClick={handleLogout} className="btn-ghost">Logout</button>
          </>
        ) : (
          <>
            <NavLink to="/login" onClick={close}>Login</NavLink>
            <Link to="/register" className="btn-primary" onClick={close}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
