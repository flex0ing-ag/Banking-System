import { useEffect, useState } from "react";
import * as api from "../api";

export default function Transactions({ token }) {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({ fromAccount: "", toAccount: "", amount: "", idempotencyKey: "", note: "", category: "General" });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadTransactions = async (nextPage = 1) => {
    try {
      const data = await api.getTransactions(token, {
        page: nextPage,
        limit: 10,
        search,
        status,
        category,
      });
      setTransactions(data.transactions || []);
      setPagination(data.pagination || null);
      setPage(nextPage);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    api.getAccounts(token).then((data) => {
      const accountList = data.accounts || [];
      setAccounts(accountList);
      if (accountList.length > 0) {
        setForm((prev) => ({ ...prev, fromAccount: accountList[0]._id }));
      }
    });
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadTransactions(1);
  }, [token, search, status, category]);

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
          note: form.note,
          category: form.category,
        },
        token,
      );
      setSuccess(data.message);
      setTransactions((prev) => [data.transaction, ...prev]);
      setForm((prev) => ({ ...prev, idempotencyKey: "", note: "", category: "General" }));
      loadTransactions(1);
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
                  {account.accountName || account._id}
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
                  {account.accountName || account._id}
                </option>
              ))}
            </select>
          </label>
          <label>
            Amount
            <input type="number" value={form.amount} onChange={handleChange("amount")} required min="0.01" step="0.01" />
          </label>
          <label>
            Category
            <input type="text" value={form.category} onChange={handleChange("category")} placeholder="General" />
          </label>
          <label>
            Note
            <input type="text" value={form.note} onChange={handleChange("note")} placeholder="Optional note" />
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

      <div className="form-panel" style={{ marginTop: "1rem" }}>
        <div className="form-grid">
          <label>
            Search
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search note/category" />
          </label>
          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
            </select>
          </label>
          <label>
            Category
            <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Filter category" />
          </label>
        </div>
      </div>

      <div className="table-shell">
        <div className="transaction-row transaction-header">
          <span>ID</span>
          <span>From</span>
          <span>To</span>
          <span>Amount</span>
          <span>Status</span>
          <span>Category</span>
        </div>
        {transactions.map((transaction) => (
          <div key={transaction._id} className="transaction-row">
            <span>{transaction._id}</span>
            <span>{transaction.fromAccount?.accountName || transaction.fromAccount?._id || transaction.fromAccount}</span>
            <span>{transaction.toAccount?.accountName || transaction.toAccount?._id || transaction.toAccount}</span>
            <span>{transaction.amount}</span>
            <span>{transaction.status}</span>
            <span>{transaction.category || "General"}</span>
          </div>
        ))}
      </div>
      {pagination && (
        <div className="button-group" style={{ justifyContent: "center", marginTop: "1rem" }}>
          <button className="button-secondary" onClick={() => loadTransactions(Math.max(1, page - 1))} disabled={page <= 1}>Previous</button>
          <span style={{ alignSelf: "center" }}>Page {pagination.page} of {pagination.pages}</span>
          <button className="button-secondary" onClick={() => loadTransactions(Math.min(pagination.pages, page + 1))} disabled={page >= pagination.pages}>Next</button>
        </div>
      )}
    </section>
  );
}
