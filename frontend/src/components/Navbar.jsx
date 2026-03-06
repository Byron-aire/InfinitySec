import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const close = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand" onClick={close}>∞ InfinitySec</Link>

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
            <Link to="/checker" onClick={close}>Password</Link>
            <Link to="/breach" onClick={close}>Breach</Link>
            <Link to="/generator" onClick={close}>Generator</Link>
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
