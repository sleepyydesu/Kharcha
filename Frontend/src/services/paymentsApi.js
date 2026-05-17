// ── Services / Recharge & Payments API ────────────────────────
// All payment service calls go through the shared request() helper.

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

// ── Organizations ─────────────────────────────────────────────
// Returns all registered organizations. Filtered by org_type_id on
// the frontend via useOrganizations(typeId).
export const getOrganizations = () => request("/organizations");

// ── Top-up ────────────────────────────────────────────────────
export const payTopup = (body) =>
  request("/payments/topup", { method: "POST", body: JSON.stringify(body) });

// ── Internet ──────────────────────────────────────────────────
export const payInternet = (body) =>
  request("/payments/internet", { method: "POST", body: JSON.stringify(body) });

// ── Landline ──────────────────────────────────────────────────
export const payLandline = (body) =>
  request("/payments/landline", { method: "POST", body: JSON.stringify(body) });

// ── Water ─────────────────────────────────────────────────────
export const payWater = (body) =>
  request("/payments/water", { method: "POST", body: JSON.stringify(body) });

// ── Electricity ───────────────────────────────────────────────
export const payElectricity = (body) =>
  request("/payments/electricity", {
    method: "POST",
    body: JSON.stringify(body),
  });

// ── School / College ──────────────────────────────────────────
export const payEducation = (body) =>
  request("/payments/education", {
    method: "POST",
    body: JSON.stringify(body),
  });
