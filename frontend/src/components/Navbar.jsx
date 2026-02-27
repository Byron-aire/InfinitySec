import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">SecureCheck</Link>
      <div className="navbar-links">
        <Link to="/tips">Tips</Link>
        {user ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/checker">Password</Link>
            <Link to="/breach">Breach</Link>
            <Link to="/generator">Generator</Link>
            <button onClick={handleLogout} className="btn-ghost">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register" className="btn-primary">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
