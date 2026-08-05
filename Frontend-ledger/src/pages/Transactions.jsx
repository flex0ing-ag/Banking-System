import { useEffect, useState } from "react";
import * as api from "../api";

export default function Transactions({ token }) {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({ fromAccount: "", toAccount: "", amount: "", idempotencyKey: "" });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    api.getAccounts(token).then((data) => {
      setAccounts(data.accounts || []);
      if (data.accounts?.length > 0) {
        setForm((prev) => ({ ...prev, fromAccount: data.accounts[0]._id }));
      }
    });
  }, [token]);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const data = await api.createTransaction(
        {
          fromAccount: form.fromAccount,
          toAccount: form.toAccount,
          amount: Number(form.amount),
          idempotencyKey: form.idempotencyKey || `txn-${Date.now()}`,
        },
        token,
      );
      setSuccess(data.message);
      setTransactions((prev) => [data.transaction, ...prev]);
      setForm((prev) => ({ ...prev, idempotencyKey: "" }));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="page-card">
      <div className="page-intro">
        <span className="eyebrow">Transfers</span>
        <h1>Move funds with confidence.</h1>
        <p>Create secure transactions and keep a polished record of every move.</p>
      </div>
      <div className="form-panel">
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            From Account
            <select value={form.fromAccount} onChange={handleChange("fromAccount")} required>
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account._id} value={account._id}>
                  {account._id}
                </option>
              ))}
            </select>
          </label>
          <label>
            To Account
            <select value={form.toAccount} onChange={handleChange("toAccount")} required>
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account._id} value={account._id}>
                  {account._id}
                </option>
              ))}
            </select>
          </label>
          <label>
            Amount
            <input type="number" value={form.amount} onChange={handleChange("amount")} required min="0.01" step="0.01" />
          </label>
          <label>
            Idempotency Key
            <input type="text" value={form.idempotencyKey} onChange={handleChange("idempotencyKey")} placeholder="unique value" />
          </label>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          <button className="button" type="submit">
            Create transaction
          </button>
        </form>
      </div>

      {transactions.length > 0 && (
        <div className="table-shell">
          <div className="transaction-row transaction-header">
            <span>ID</span>
            <span>From</span>
            <span>To</span>
            <span>Amount</span>
            <span>Status</span>
          </div>
          {transactions.map((transaction) => (
            <div key={transaction._id} className="transaction-row">
              <span>{transaction._id}</span>
              <span>{transaction.fromAccount}</span>
              <span>{transaction.toAccount}</span>
              <span>{transaction.amount}</span>
              <span>{transaction.status}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
