import { useState } from "react";

export default function Login({ onSubmit, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ email, password });
  };

  return (
    <section className="page-card auth-shell">
      <div className="auth-hero">
        <div>
          <span className="eyebrow">Secure access</span>
          <h1>Welcome back to your financial workspace.</h1>
          <p>Monitor balances, manage accounts, and complete transfers in a calm, premium environment.</p>
        </div>
        <ul>
          <li>Protected account controls</li>
          <li>Instant balance updates</li>
          <li>Beautiful transaction tracking</li>
        </ul>
      </div>
      <div className="auth-card">
        <h1>Login</h1>
        <p>Access your dashboard securely.</p>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <div className="error-message">{error}</div>}
          <button className="button" type="submit">
            Sign in
          </button>
        </form>
      </div>
    </section>
  );
}
