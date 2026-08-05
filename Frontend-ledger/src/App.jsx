import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import * as api from "./api";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/Accounts";
import Transactions from "./pages/Transactions";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("ledger-user");
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("ledger-token") || null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      localStorage.setItem("ledger-user", JSON.stringify(user));
    } else {
      localStorage.removeItem("ledger-user");
    }

    if (token) {
      localStorage.setItem("ledger-token", token);
    } else {
      localStorage.removeItem("ledger-token");
    }
  }, [user, token]);

  const handleAuth = async (action, payload) => {
    try {
      const data = await api[action](payload, token);
      setUser(data.user);
      setToken(data.token);
      setError(null);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Authentication failed");
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout(token);
    } catch (err) {
      console.warn("Logout error", err);
    }
    setUser(null);
    setToken(null);
    setError(null);
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <Navbar user={user} onLogout={handleLogout} />
      <main className="page-container">
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/login" element={<Login onSubmit={(payload) => handleAuth("login", payload)} error={error} />} />
          <Route path="/register" element={<Register onSubmit={(payload) => handleAuth("register", payload)} error={error} />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={user}>
                <Dashboard user={user} token={token} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/accounts"
            element={
              <ProtectedRoute user={user}>
                <Accounts token={token} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <ProtectedRoute user={user}>
                <Transactions token={token} />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
