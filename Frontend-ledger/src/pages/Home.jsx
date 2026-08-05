import { Link } from "react-router-dom";

export default function Home({ user }) {
  return (
    <section className="page-card">
      <div className="page-intro">
        <span className="eyebrow">Premium Financial OS</span>
        <h1>Banking elegance, designed for modern money movement.</h1>
        <p>Track accounts, review balances, and move value seamlessly with a polished experience built for trusted digital finance.</p>
      </div>
      {user ? (
        <div>
          <p>Signed in as <strong>{user.name}</strong>.</p>
          <div className="hero-actions">
            <Link className="button" to="/dashboard">
              Open dashboard
            </Link>
            <Link className="button button-secondary" to="/accounts">
              Manage accounts
            </Link>
          </div>
        </div>
      ) : (
        <div className="button-group">
          <Link className="button" to="/login">
            Login
          </Link>
          <Link className="button button-secondary" to="/register">
            Register
          </Link>
        </div>
      )}
      <div className="metric-grid">
        <div className="metric-card">
          <span>Secure transfers</span>
          <strong>Instant</strong>
        </div>
        <div className="metric-card">
          <span>Account visibility</span>
          <strong>Real-time</strong>
        </div>
        <div className="metric-card">
          <span>Experience</span>
          <strong>Premium</strong>
        </div>
      </div>
    </section>
  );
}
