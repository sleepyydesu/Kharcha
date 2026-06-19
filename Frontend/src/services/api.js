/**
 * services/api.js — Central fetch client (cookie-based auth).
 *
 * All requests go out with credentials: "include" so the browser
 * automatically attaches the httpOnly kharcha_access cookie.
 * No token is ever read from or written to localStorage here.
 *
 * On 401: attempt a silent token refresh (POST /auth/refresh),
 * then retry the original request once. If the refresh itself
 * fails, fire "kharcha:session-expired" so App.jsx can show the
 * modal and return to the login screen.
 */

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ── Refresh state ─────────────────────────────────────────────
let isRefreshing = false;
let refreshWaiters = []; // [{ resolve, reject }]

function onRefreshDone(ok, err) {
  if (ok) {
    refreshWaiters.forEach(({ resolve }) => resolve());
  } else {
    refreshWaiters.forEach(({ reject }) => reject(err));
  }

  refreshWaiters = [];
}

function waitForRefresh() {
  return new Promise((resolve, reject) => {
    refreshWaiters.push({ resolve, reject });
  });
}

// ── Core fetch wrapper ────────────────────────────────────────
async function request(path, options = {}, _isRetry = false) {
  const {
    trackActivity = true,
    skipSessionRefresh = false,
    ...fetchOptions
  } = options;

  const isFormData =
    typeof FormData !== "undefined" && fetchOptions.body instanceof FormData;

  const res = await fetch(`${BASE}${path}`, {
    ...fetchOptions,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...fetchOptions.headers,
    },
  });

  // ── Success ───────────────────────────────────────────────
  if (res.ok) {
    // Reset the idle clock for useSessionWarning, but NOT for the silent
    // /auth/refresh call — that's a background token rotation, not user
    // activity. If we reset here, the 25-min warning never fires because
    // the refresh keeps the clock fresh every 15 min even when idle.
    if (trackActivity && path !== "/auth/refresh") {
      sessionStorage.setItem("kharcha_last_activity_at", String(Date.now()));
      window.dispatchEvent(new CustomEvent("kharcha:activity"));
    }

    const contentType = res.headers.get("content-type") || "";

    // Handle empty responses safely
    if (res.status === 204) return null;

    // Return JSON only if response is actually JSON
    if (contentType.includes("application/json")) {
      return res.json();
    }

    return res.text();
  }

  // ── 401 handling ──────────────────────────────────────────
  if (res.status === 401 && !_isRetry && !skipSessionRefresh) {
    // Don't refresh if refresh itself failed
    if (path === "/auth/refresh") {
      window.dispatchEvent(new CustomEvent("kharcha:session-expired"));

      const data = await res.json().catch(() => ({}));

      throw new Error(data.message || "Session expired");
    }

    // Queue if refresh already running
    if (isRefreshing) {
      try {
        await waitForRefresh();

        return request(path, options, true);
      } catch {
        throw new Error("Session expired");
      }
    }

    // Start refresh flow
    isRefreshing = true;

    try {
      const refreshRes = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (!refreshRes.ok) {
        isRefreshing = false;

        onRefreshDone(false, new Error("Session expired"));

        window.dispatchEvent(new CustomEvent("kharcha:session-expired"));

        throw new Error("Session expired");
      }

      isRefreshing = false;
      onRefreshDone(true);

      // Retry original request
      return request(path, options, true);
    } catch (err) {
      isRefreshing = false;

      onRefreshDone(false, err);

      window.dispatchEvent(new CustomEvent("kharcha:session-expired"));

      throw err;
    }
  }

  // ── Other errors ──────────────────────────────────────────
  const data = await res.json().catch(() => ({}));

  throw new Error(data.message || `Request failed (${res.status})`);
}

// ── Auth ──────────────────────────────────────────────────────
export const signIn = (body) =>
  request("/auth/signin", {
    method: "POST",
    body: JSON.stringify(body),
    skipSessionRefresh: true,
  });

export const signupCheck = (body) =>
  request("/auth/signup/check", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const signupSendOtp = (body) =>
  request("/auth/signup/send-otp", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const signupVerifyOtp = (body) =>
  request("/auth/signup/verify-otp", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const signupComplete = (body) =>
  request("/auth/signup/complete", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const signOut = () =>
  request("/auth/signout", {
    method: "POST",
  });

export const signOutAll = () =>
  request("/auth/signout-all", {
    method: "POST",
  });

export const keepSessionAlive = () =>
  request("/auth/refresh", {
    method: "POST",
    trackActivity: false,
  });

// ── Wallet ────────────────────────────────────────────────────
export const getWallet = (options = {}) => request("/wallet", options);

export const transfer = (body) =>
  request("/wallet/transfer", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const lookupReceiver = (id) =>
  request(`/wallet/lookup?identifier=${encodeURIComponent(id)}`);

// ── Profile ───────────────────────────────────────────────────
export const getProfile = () => request("/profile");

export const updateProfile = (body) =>
  request("/profile", {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const uploadProfilePicture = (body) =>
  request("/profile/picture", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const deleteProfilePicture = () =>
  request("/profile/picture", {
    method: "DELETE",
  });

// ── Khalti ────────────────────────────────────────────────────
export const initiateKhalti = (amount) =>
  request("/khalti/initiate", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
//--─ eSewa ────────────────────────────────────────────────────
export const initiateEsewa = (amount) =>
  request("/esewa/initiate", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
// ── Gift Cards ────────────────────────────────────────────────
export const redeemGiftCard = (code) =>
  request("/gift-cards/redeem", {
    method: "POST",
    body: JSON.stringify({ code }),
  });

// ── Transactions / Statements ─────────────────────────────────
export const getTransactions = (params = {}) => {
  const q = new URLSearchParams();

  if (params.type && params.type !== "all") {
    q.set("type", params.type);
  }

  if (params.category_id) {
    q.set("category_id", params.category_id);
  }

  if (params.start_date) {
    q.set("start_date", params.start_date);
  }

  if (params.end_date) {
    q.set("end_date", params.end_date);
  }

  if (params.page) {
    q.set("page", params.page);
  }

  if (params.limit) {
    q.set("limit", params.limit);
  }

  return request(`/transactions?${q.toString()}`);
};

export const getTransactionCategories = () =>
  request("/transactions/categories");

export const getTransactionById = (id) =>
  request(`/transactions/${encodeURIComponent(id)}`);

// ── Categories ────────────────────────────────────────────────
export const getCategories = () => request("/categories");

export const createCategory = (body) =>
  request("/categories", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateCategory = (id, body) =>
  request(`/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const deleteCategory = (id) =>
  request(`/categories/${id}`, {
    method: "DELETE",
  });

export const uploadCategoryIcon = (id, body) =>
  request(`/categories/${id}/icon`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const deleteCategoryIcon = (id) =>
  request(`/categories/${id}/icon`, {
    method: "DELETE",
  });

// ── KYC ───────────────────────────────────────────────────────
export const submitKYC = (formData) =>
  request("/kyc/submit", { method: "POST", body: formData });

// ── Auth — MPIN ───────────────────────────────────────────────
export const getMpinStatus = () => request("/auth/mpin/status");

export const setupMpin = (body) =>
  request("/auth/mpin/setup", { method: "POST", body: JSON.stringify(body) });

export const changeMpin = (body) =>
  request("/auth/mpin/change", { method: "POST", body: JSON.stringify(body) });

// ── Auth — Password reset ─────────────────────────────────────
export const sendPasswordResetOTP = (body) =>
  request("/auth/password/forgot-send-otp", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const resetPassword = (body) =>
  request("/auth/password/reset", {
    method: "POST",
    body: JSON.stringify(body),
  });

// ── Expenses ──────────────────────────────────────────────────
export const getExpenseOverview = (start_date, end_date) =>
  request(`/expenses?start_date=${start_date}&end_date=${end_date}`);

export const getExpensesByCategory = (
  categoryId,
  start_date,
  end_date,
  page = 1,
) =>
  request(
    `/expenses/category/${categoryId}?start_date=${start_date}&end_date=${end_date}&page=${page}&limit=50`,
  );

export const createExpense = (payload) =>
  request("/expenses", { method: "POST", body: JSON.stringify(payload) });

export const updateExpense = (id, payload) =>
  request(`/expenses/${id}`, { method: "PUT", body: JSON.stringify(payload) });

export const deleteExpense = (id) =>
  request(`/expenses/${id}`, { method: "DELETE" });

// ── Income ────────────────────────────────────────────────────
export const getIncome = (start_date, end_date) =>
  request(`/income?start_date=${start_date}&end_date=${end_date}`);

export const createIncome = (payload) =>
  request("/income", { method: "POST", body: JSON.stringify(payload) });

export const updateIncome = (id, payload) =>
  request(`/income/${id}`, { method: "PUT", body: JSON.stringify(payload) });

export const deleteIncome = (id) =>
  request(`/income/${id}`, { method: "DELETE" });

// ── Budgets ───────────────────────────────────────────────────
export const getBudgets = (start_date, end_date) =>
  request(`/budgets?start_date=${start_date}&end_date=${end_date}`);

export const createBudget = (payload) =>
  request("/budgets", { method: "POST", body: JSON.stringify(payload) });

export const updateBudget = (id, payload) =>
  request(`/budgets/${id}`, { method: "PUT", body: JSON.stringify(payload) });

export const deleteBudget = (id) =>
  request(`/budgets/${id}`, { method: "DELETE" });

// ── API Keys (org) ────────────────────────────────────────────
export const listApiKeys = () => request("/org/api-keys");

export const createApiKey = (body) =>
  request("/org/api-keys", { method: "POST", body: JSON.stringify(body) });

export const updateApiKey = (id, body) =>
  request(`/org/api-keys/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const revokeApiKey = (id) =>
  request(`/org/api-keys/${id}`, { method: "DELETE" });

export const listPosTerminals = () => request("/pos-terminals");

export const createPosTerminal = (body) =>
  request("/pos-terminals", { method: "POST", body: JSON.stringify(body) });

export const revokePosTerminal = (id) =>
  request(`/pos-terminals/${id}/revoke`, { method: "POST" });

// ── Dynamic QR Codes (org) ────────────────────────────────────
export const listOrgQRCodes = () => request("/org/qr-codes");

export const createOrgQRCode = (body) =>
  request("/org/qr-codes", { method: "POST", body: JSON.stringify(body) });

export const updateOrgQRCode = (id, body) =>
  request(`/org/qr-codes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteOrgQRCode = (id) =>
  request(`/org/qr-codes/${id}`, { method: "DELETE" });

export const resolveQRCode = (qr_id) => request(`/qr-codes/${qr_id}`);

// ── Payment Sessions ──────────────────────────────────────────
export const createPaymentSession = (body) =>
  request("/org/qr-codes/payments/create", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const getPaymentSessionStatus = (session_id) =>
  request(`/org/qr-codes/payments/status/${session_id}`);

// ── POS Checkout ──────────────────────────────────────────────
export const resolveCheckout = (session_id) =>
  request(`/pos/checkout/${session_id}`);

export const payCheckout = (session_id, body = {}) =>
  request(`/pos/checkout/${session_id}/pay`, {
    method: "POST",
    body: JSON.stringify(body),
  });

// ── AI Assistant ──────────────────────────────────────────────
export const chatWithBot = (body) =>
  request("/ai/chat", { method: "POST", body: JSON.stringify(body) });

// ── Kharcha Card ──────────────────────────────────────────────
export const getMyCards = () => request("/cards/my-cards");

export const requestCard = (body = {}) =>
  request("/cards/request", { method: "POST", body: JSON.stringify(body) });

export const blockMyCard = (body = {}) =>
  request("/cards/my-card/block", {
    method: "POST",
    body: JSON.stringify(body),
  });

// ── Admin — Verification ──────────────────────────────────────
// ── Admin — KYC ──────────────────────────────────────────────
export const adminListVerifications = ({
  status = "pending",
  page = 1,
  limit = 50,
} = {}) => {
  const q = new URLSearchParams({ status, page, limit });
  return request(`/kyc/admin/submissions?${q.toString()}`);
};

export const adminGetVerification = (submission_id) =>
  request(`/kyc/admin/submissions/${submission_id}`);

export const adminReviewVerification = (
  submission_id,
  { action, admin_notes },
) =>
  request(
    `/kyc/admin/submissions/${submission_id}/${action === "approve" ? "approve" : "reject"}`,
    {
      method: "POST",
      body: JSON.stringify({ reason: admin_notes }),
    },
  );
// ── Admin — Gift Cards ────────────────────────────────────────
export const adminListGiftCards = ({
  is_active,
  page = 1,
  limit = 100,
} = {}) => {
  const q = new URLSearchParams({ page, limit });
  if (is_active !== undefined) q.set("is_active", is_active);
  return request(`/gift-cards?${q.toString()}`);
};

export const adminGenerateGiftCards = (body) =>
  request("/gift-cards/generate", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const adminDeactivateGiftCard = (gift_card_id) =>
  request(`/gift-cards/${gift_card_id}/deactivate`, { method: "PATCH" });

// ── Admin — Card Requests ─────────────────────────────────────
export const adminListCardRequests = (status = "") => {
  const q = new URLSearchParams();
  if (status) q.set("status", status);
  return request(`/cards/admin/requests?${q.toString()}`);
};

export const adminActivateCard = (body) =>
  request("/cards/admin/activate-physical", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const issueVirtualCard = () =>
  request("/cards/virtual/issue", { method: "POST", body: JSON.stringify({}) });

export const requestPhysicalCard = (body = {}) =>
  request("/cards/physical/request", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const blockCard = (cardType, body = {}) =>
  request(`/cards/${cardType}/block`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateCardLimits = (cardType, body) =>
  request(`/cards/${cardType}/limits`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

// ── Biometric (WebAuthn) ──────────────────────────────────────
export const biometricRegisterApi = (body) =>
  request("/auth/biometric/register", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const biometricVerifyApi = (body) =>
  request("/auth/biometric/verify", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const biometricVerifyTransactionApi = (body) =>
  request("/auth/biometric/verify-transaction", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const deleteBiometricCredentialApi = (body) =>
  request("/auth/biometric/credential", {
    method: "DELETE",
    body: JSON.stringify(body),
  });

// Verify current MPIN without changing it — used before sensitive operations
export const verifyMpinApi = (body) =>
  request("/auth/mpin/verify", {
    method: "POST",
    body: JSON.stringify(body),
  });
