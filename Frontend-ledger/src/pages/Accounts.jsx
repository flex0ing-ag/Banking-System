import { useEffect, useState } from "react";
import * as api from "../api";

export default function Accounts({ token }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [depositAmounts, setDepositAmounts] = useState({});

  const loadAccounts = async () => {
    try {
      const data = await api.getAccounts(token);
      setAccounts(data.accounts || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [token]);

  const createAccount = async () => {
    try {
      await api.createAccount(token);
      loadAccounts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddBalance = async (accountId) => {
    const amount = Number(depositAmounts[accountId]);

    if (!amount || amount <= 0) {
      setError("Enter a valid amount to deposit.");
      return;
    }

    try {
      await api.addBalanceToAccount(accountId, {
        amount,
        idempotencyKey: `${accountId}-${Date.now()}`,
      }, token);
      setDepositAmounts((prev) => ({ ...prev, [accountId]: "" }));
      loadAccounts();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="page-card">
      <div className="page-intro">
        <span className="eyebrow">Accounts</span>
        <h1>Manage your financial accounts with clarity.</h1>
        <p>Create new accounts and add funds while keeping every balance visible in one refined view.</p>
      </div>
      <button className="button" onClick={createAccount}>
        Create Account
      </button>
      {loading ? (
        <p>Loading accounts...</p>
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : (
        <div className="table-shell">
          <div className="account-row account-header">
            <span>ID</span>
            <span>Currency</span>
            <span>Status</span>
            <span>Balance</span>
            <span>Action</span>
          </div>
          {accounts.map((account) => (
            <div key={account._id} className="account-row">
              <span>{account._id}</span>
              <span>{account.currency}</span>
              <span>{account.status}</span>
              <span>{account.balance ?? 0}</span>
              <span>
                <input
                  type="number"
                  min="1"
                  value={depositAmounts[account._id] || ""}
                  onChange={(event) =>
                    setDepositAmounts((prev) => ({
                      ...prev,
                      [account._id]: event.target.value,
                    }))
                  }
                  placeholder="Amount"
                  style={{ marginRight: "0.5rem", width: "90px" }}
                />
                <button className="button" onClick={() => handleAddBalance(account._id)}>
                  Add Balance
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
