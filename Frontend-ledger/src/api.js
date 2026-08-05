const BASE_URL = "/api";

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(body?.message || "API request failed");
    error.status = response.status;
    throw error;
  }

  return body;
}

function getAuthHeaders(token) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function register(payload) {
  return request("/auth/register", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function login(payload) {
  return request("/auth/login", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function logout(token) {
  return request("/auth/logout", {
    method: "POST",
    headers: getAuthHeaders(token),
  });
}

export async function createAccount(token) {
  return request("/accounts/", {
    method: "POST",
    headers: getAuthHeaders(token),
  });
}

export async function getAccounts(token) {
  return request("/accounts/", {
    method: "GET",
    headers: getAuthHeaders(token),
  });
}

export async function getAccountBalance(accountId, token) {
  return request(`/accounts/balance/${accountId}`, {
    method: "GET",
    headers: getAuthHeaders(token),
  });
}

export async function addBalanceToAccount(accountId, payload, token) {
  return request(`/accounts/balance/${accountId}`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function createTransaction(payload, token) {
  return request("/transactions/", {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function getTransactions(token) {
  return request("/transactions/", {
    method: "GET",
    headers: getAuthHeaders(token),
  });
}
