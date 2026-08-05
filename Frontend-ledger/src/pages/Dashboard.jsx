import { useEffect, useState } from "react";
import * as api from "../api";

export default function Dashboard({ user, token }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;

    api
      .getAccounts(token)
      .then((data) => {
        setAccounts(data.accounts || []);
        setLoading(false);
        if (data.accounts?.length > 0) {
          setSelectedAccount(data.accounts[0]._id);
        }
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    if (!selectedAccount) return;

    api
      .getAccountBalance(selectedAccount, token)
      .then((data) => setBalance(data.balance))
      .catch((err) => setError(err.message));
  }, [selectedAccount, token]);

  if (loading) {
    return <section className="page-card"><div className="page-intro"><span className="eyebrow">Loading</span><h1>Preparing your financial overview…</h1></div></section>;
  }

  return (
    <section className="page-card">
      <div className="page-intro">
        <span className="eyebrow">Overview</span>
        <h1>Welcome back, {user.name}.</h1>
        <p>Your accounts are ready for review, transfers, and smart money control.</p>
      </div>
      {error && <span className="error-message">{error}</span>}
      <div className="dashboard-grid">
        <div className="dashboard-panel">
          <div className="panel-heading">
            <h2>Your accounts</h2>
            <span className="eyebrow">Live</span>
          </div>
          {accounts.length === 0 ? (
            <p>No accounts found. Create one on the Accounts page.</p>
          ) : (
            <ul className="account-list">
              {accounts.map((account) => (
                <li key={account._id}>{account._id} <strong>• {account.currency}</strong></li>
              ))}
            </ul>
          )}
        </div>
        <div className="dashboard-panel">
          <div className="panel-heading">
            <h2>Balance</h2>
            <span className="eyebrow">Selected</span>
          </div>
          <label>
            Select account
            <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>
              {accounts.map((account) => (
                <option key={account._id} value={account._id}>{account._id}</option>
              ))}
            </select>
          </label>
          <div className="balance-card">
            <span>Current balance</span>
            <strong>{balance ?? "N/A"}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
