// ─────────────────────────────────────────────────────────────
//  Kharcha API Service
//  Base URL: set VITE_API_URL in .env (e.g. http://localhost:5000)
// ─────────────────────────────────────────────────────────────

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

// ── Wallet ────────────────────────────────────────────────────
export const getWallet      = ()       => request('/wallet');
// body: { receiver_identifier, amount, category_id?, remarks?, mpin }
export const transfer       = (body)   => request('/wallet/transfer', { method: 'POST', body: JSON.stringify(body) });
export const lookupReceiver = (id)     => request(`/wallet/lookup?identifier=${encodeURIComponent(id)}`);

// ── Profile ───────────────────────────────────────────────────
export const getProfile             = ()     => request('/profile');
export const updateProfile          = (body) => request('/profile', { method: 'PATCH', body: JSON.stringify(body) });
export const uploadProfilePicture   = (body) => request('/profile/picture', { method: 'POST', body: JSON.stringify(body) });
export const deleteProfilePicture   = ()     => request('/profile/picture', { method: 'DELETE' });

// ── Khalti ────────────────────────────────────────────────────
export const initiateKhalti = (amount) => request('/khalti/initiate', { method: 'POST', body: JSON.stringify({ amount }) });

// ── Gift Cards ────────────────────────────────────────────────
export const redeemGiftCard = (code) => request('/gift-cards/redeem', { method: 'POST', body: JSON.stringify({ code }) });

// ── Transactions / Statements ─────────────────────────────────
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
export const getTransactionById       = (id) => request(`/transactions/${encodeURIComponent(id)}`);

// ── Categories (Expense Tracker) ──────────────────────────────
export const getCategories    = ()     => request('/categories');
export const createCategory   = (body) => request('/categories', { method: 'POST', body: JSON.stringify(body) });
export const updateCategory   = (id, body) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteCategory   = (id)  => request(`/categories/${id}`, { method: 'DELETE' });

/**
 * Upload an image icon for a custom category.
 *
 * Usage:
 *   const file = e.target.files[0];
 *   const reader = new FileReader();
 *   reader.onload = async (ev) => {
 *     const base64 = ev.target.result.split(',')[1];
 *     const { icon_url } = await uploadCategoryIcon(categoryId, { file_base64: base64, mime_type: file.type });
 *   };
 *   reader.readAsDataURL(file);
 */
export const uploadCategoryIcon = (id, body) =>
  request(`/categories/${id}/icon`, { method: 'POST', body: JSON.stringify(body) });

export const deleteCategoryIcon = (id) =>
  request(`/categories/${id}/icon`, { method: 'DELETE' });

// ── KYC Verification ──────────────────────────────────────────
export const submitKYC = (body) =>
  request('/admin/verification/request', { method: 'POST', body: JSON.stringify(body) });

// ── Auth — MPIN ───────────────────────────────────────────────
export const setupMpin  = (body) => request('/auth/mpin/setup',  { method: 'POST', body: JSON.stringify(body) });
export const changeMpin = (body) => request('/auth/mpin/change', { method: 'POST', body: JSON.stringify(body) });

// ── Auth — Password reset (OTP-based) ─────────────────────────
export const sendPasswordResetOTP = (body) =>
  request('/auth/password/forgot-send-otp', { method: 'POST', body: JSON.stringify(body) });
export const resetPassword = (body) =>
  request('/auth/password/reset', { method: 'POST', body: JSON.stringify(body) });

// ── API Keys (org) ─────────────────────────────────────────────
export const listApiKeys    = ()           => request('/org/api-keys');
export const createApiKey   = (body)       => request('/org/api-keys', { method: 'POST', body: JSON.stringify(body) });
export const updateApiKey   = (id, body)   => request(`/org/api-keys/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
export const revokeApiKey   = (id)         => request(`/org/api-keys/${id}`, { method: 'DELETE' });

// ── Dynamic QR Codes (org) ─────────────────────────────────────
export const listOrgQRCodes   = ()          => request('/org/qr-codes');
export const createOrgQRCode  = (body)      => request('/org/qr-codes', { method: 'POST', body: JSON.stringify(body) });
export const updateOrgQRCode  = (id, body)  => request(`/org/qr-codes/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
export const deleteOrgQRCode  = (id)        => request(`/org/qr-codes/${id}`, { method: 'DELETE' });

// Public — no auth needed — resolves a dynamic QR to payment details
export const resolveQRCode = (qr_id) => request(`/qr-codes/${qr_id}`);