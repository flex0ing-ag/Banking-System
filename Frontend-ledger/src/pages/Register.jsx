import { useState } from "react";

export default function Register({ onSubmit, error }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ name, email, password });
  };

  return (
    <section className="page-card auth-shell">
      <div className="auth-hero">
        <div>
          <span className="eyebrow">New account</span>
          <h1>Join a refined experience for everyday banking.</h1>
          <p>Create your profile and step into a secure overview of your accounts and transfers.</p>
        </div>
        <ul>
          <li>Simple onboarding</li>
          <li>Clear account insights</li>
          <li>Elegant transaction history</li>
        </ul>
      </div>
      <div className="auth-card">
        <h1>Register</h1>
        <p>Create your account to get started.</p>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Name
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </label>
          {error && <div className="error-message">{error}</div>}
          <button className="button" type="submit">
            Create account
          </button>
        </form>
      </div>
    </section>
  );
}
