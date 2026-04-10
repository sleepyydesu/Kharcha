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
// Transactions / Statements
export const getTransactions = (params = {}) => {
  const q = new URLSearchParams();
  if (params.type        && params.type !== 'all') q.set('type',        params.type);
  if (params.category_id)                          q.set('category_id', params.category_id);
  if (params.start_date)                           q.set('start_date',  params.start_date);
  if (params.end_date)                             q.set('end_date',    params.end_date);
  if (params.page)                                 q.set('page',        params.page);
  if (params.limit)                                q.set('limit',       params.limit);
  return request(`/transactions?${q.toString()}`);
};

export const getTransactionCategories = () => request('/transactions/categories');