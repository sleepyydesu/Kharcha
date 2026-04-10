// ─────────────────────────────────────────────────────────
//  Kharcha API Service
//  Base URL: set VITE_API_URL in .env (e.g. http://localhost:5000)
// ─────────────────────────────────────────────────────────

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// Wallet
export const getWallet  = ()           => request('/wallet');
export const transfer   = (body)       => request('/wallet/transfer', { method: 'POST', body: JSON.stringify(body) });
export const lookupReceiver = (id)     => request(`/wallet/lookup?identifier=${encodeURIComponent(id)}`);

// Profile
export const getProfile = ()           => request('/profile');

// Khalti
export const initiateKhalti = (amount) => request('/khalti/initiate', { method: 'POST', body: JSON.stringify({ amount }) });

// Gift Cards
export const redeemGiftCard = (code)   => request('/gift-cards/redeem', { method: 'POST', body: JSON.stringify({ code }) });