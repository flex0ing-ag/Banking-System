import { Link } from "react-router-dom";

export default function Navbar({ user, onLogout }) {
  return (
    <header className="navbar">
      <div className="brand">
        <span className="brand-mark">L</span>
        <span>Ledger Nexus</span>
      </div>
      <nav className="nav-links">
        <Link to="/">Home</Link>
        {user ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/accounts">Accounts</Link>
            <Link to="/transactions">Transactions</Link>
            <button className="link-button" onClick={onLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </nav>
    </header>
  );
}
