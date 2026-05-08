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
// Ensures multiple concurrent 401s share one refresh round-trip.
let isRefreshing   = false;
let refreshWaiters = []; // [{ resolve, reject }]

function onRefreshDone(ok, err) {
    if (ok) refreshWaiters.forEach(({ resolve }) => resolve());
    else     refreshWaiters.forEach(({ reject })  => reject(err));
    refreshWaiters = [];
}

function waitForRefresh() {
    return new Promise((resolve, reject) =>
        refreshWaiters.push({ resolve, reject }),
    );
}

// ── Core fetch wrapper ────────────────────────────────────────
async function request(path, options = {}, _isRetry = false) {
    const res = await fetch(`${BASE}${path}`, {
        ...options,
        credentials: "include",         // send httpOnly cookies on every request
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

    // Happy path
    if (res.ok) return res.json();

    // ── 401 handling ──────────────────────────────────────────
    if (res.status === 401 && !_isRetry) {
        // Don't try to refresh if the 401 came from refresh itself
        if (path === "/auth/refresh") {
            window.dispatchEvent(new CustomEvent("kharcha:session-expired"));
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || "Session expired");
        }

        // If a refresh is already in flight, queue behind it
        if (isRefreshing) {
            try {
                await waitForRefresh();
                return request(path, options, true); // retry once
            } catch {
                throw new Error("Session expired");
            }
        }

        // Kick off a refresh
        isRefreshing = true;
        try {
            const refreshRes = await fetch(`${BASE}/auth/refresh`, {
                method:      "POST",
                credentials: "include",
            });

            if (!refreshRes.ok) {
                // Refresh failed — session truly expired
                isRefreshing = false;
                onRefreshDone(false, new Error("Session expired"));
                window.dispatchEvent(new CustomEvent("kharcha:session-expired"));
                throw new Error("Session expired");
            }

            isRefreshing = false;
            onRefreshDone(true);

            // Retry the original request with the new cookie
            return request(path, options, true);
        } catch (err) {
            isRefreshing = false;
            onRefreshDone(false, err);
            window.dispatchEvent(new CustomEvent("kharcha:session-expired"));
            throw err;
        }
    }

    // ── Other error statuses ──────────────────────────────────
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Request failed (${res.status})`);
}

// ── Auth ──────────────────────────────────────────────────────
export const signIn = (body) =>
    request("/auth/signin", { method: "POST", body: JSON.stringify(body) });

export const signupCheck = (body) =>
    request("/auth/signup/check", { method: "POST", body: JSON.stringify(body) });

export const signupSendOtp = (body) =>
    request("/auth/signup/send-otp", { method: "POST", body: JSON.stringify(body) });

export const signupVerifyOtp = (body) =>
    request("/auth/signup/verify-otp", { method: "POST", body: JSON.stringify(body) });

export const signupComplete = (body) =>
    request("/auth/signup/complete", { method: "POST", body: JSON.stringify(body) });

export const signOut = () =>
    request("/auth/signout", { method: "POST" });

export const signOutAll = () =>
    request("/auth/signout-all", { method: "POST" });

// ── Wallet ────────────────────────────────────────────────────
export const getWallet = () => request("/wallet");

export const transfer = (body) =>
    request("/wallet/transfer", { method: "POST", body: JSON.stringify(body) });

export const lookupReceiver = (id) =>
    request(`/wallet/lookup?identifier=${encodeURIComponent(id)}`);

// ── Profile ───────────────────────────────────────────────────
export const getProfile = () => request("/profile");

export const updateProfile = (body) =>
    request("/profile", { method: "PATCH", body: JSON.stringify(body) });

export const uploadProfilePicture = (body) =>
    request("/profile/picture", { method: "POST", body: JSON.stringify(body) });

export const deleteProfilePicture = () =>
    request("/profile/picture", { method: "DELETE" });

// ── Khalti ────────────────────────────────────────────────────
export const initiateKhalti = (amount) =>
    request("/khalti/initiate", { method: "POST", body: JSON.stringify({ amount }) });

// ── Gift Cards ────────────────────────────────────────────────
export const redeemGiftCard = (code) =>
    request("/gift-cards/redeem", { method: "POST", body: JSON.stringify({ code }) });

// ── Transactions / Statements ─────────────────────────────────
export const getTransactions = (params = {}) => {
    const q = new URLSearchParams();
    if (params.type && params.type !== "all") q.set("type", params.type);
    if (params.category_id) q.set("category_id", params.category_id);
    if (params.start_date)  q.set("start_date",  params.start_date);
    if (params.end_date)    q.set("end_date",     params.end_date);
    if (params.page)        q.set("page",         params.page);
    if (params.limit)       q.set("limit",        params.limit);
    return request(`/transactions?${q.toString()}`);
};

export const getTransactionCategories = () => request("/transactions/categories");

export const getTransactionById = (id) =>
    request(`/transactions/${encodeURIComponent(id)}`);

// ── Categories ────────────────────────────────────────────────
export const getCategories = () => request("/categories");

export const createCategory = (body) =>
    request("/categories", { method: "POST", body: JSON.stringify(body) });

export const updateCategory = (id, body) =>
    request(`/categories/${id}`, { method: "PUT", body: JSON.stringify(body) });

export const deleteCategory = (id) =>
    request(`/categories/${id}`, { method: "DELETE" });

export const uploadCategoryIcon = (id, body) =>
    request(`/categories/${id}/icon`, { method: "POST", body: JSON.stringify(body) });

export const deleteCategoryIcon = (id) =>
    request(`/categories/${id}/icon`, { method: "DELETE" });

// ── KYC ───────────────────────────────────────────────────────
export const submitKYC = (body) =>
    request("/admin/verification/request", { method: "POST", body: JSON.stringify(body) });

// ── Auth — MPIN ───────────────────────────────────────────────
export const getMpinStatus = () => request("/auth/mpin/status");

export const setupMpin = (body) =>
    request("/auth/mpin/setup", { method: "POST", body: JSON.stringify(body) });

export const changeMpin = (body) =>
    request("/auth/mpin/change", { method: "POST", body: JSON.stringify(body) });

// ── Auth — Password reset ─────────────────────────────────────
export const sendPasswordResetOTP = (body) =>
    request("/auth/password/forgot-send-otp", { method: "POST", body: JSON.stringify(body) });

export const resetPassword = (body) =>
    request("/auth/password/reset", { method: "POST", body: JSON.stringify(body) });

// ── Expenses ──────────────────────────────────────────────────
export const getExpenseOverview = (start_date, end_date) =>
    request(`/expenses?start_date=${start_date}&end_date=${end_date}`);

export const getExpensesByCategory = (categoryId, start_date, end_date, page = 1) =>
    request(`/expenses/category/${categoryId}?start_date=${start_date}&end_date=${end_date}&page=${page}&limit=50`);

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
    request(`/org/api-keys/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const revokeApiKey = (id) =>
    request(`/org/api-keys/${id}`, { method: "DELETE" });

// ── Dynamic QR Codes (org) ────────────────────────────────────
export const listOrgQRCodes = () => request("/org/qr-codes");

export const createOrgQRCode = (body) =>
    request("/org/qr-codes", { method: "POST", body: JSON.stringify(body) });

export const updateOrgQRCode = (id, body) =>
    request(`/org/qr-codes/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const deleteOrgQRCode = (id) =>
    request(`/org/qr-codes/${id}`, { method: "DELETE" });

export const resolveQRCode = (qr_id) => request(`/qr-codes/${qr_id}`);

// ── Payment Sessions ──────────────────────────────────────────
export const createPaymentSession = (body) =>
    request("/org/qr-codes/payments/create", { method: "POST", body: JSON.stringify(body) });

export const getPaymentSessionStatus = (session_id) =>
    request(`/org/qr-codes/payments/status/${session_id}`);

// ── POS Checkout ──────────────────────────────────────────────
export const resolveCheckout = (session_id) =>
    request(`/pos/checkout/${session_id}`);

export const payCheckout = (session_id, body = {}) =>
    request(`/pos/checkout/${session_id}/pay`, { method: "POST", body: JSON.stringify(body) });

// ── AI Assistant ──────────────────────────────────────────────
export const chatWithBot = (body) =>
    request("/ai/chat", { method: "POST", body: JSON.stringify(body) });

// ── Kharcha Card ──────────────────────────────────────────────
export const getMyCards = () => request("/cards/my-cards");

export const issueVirtualCard = () =>
    request("/cards/virtual/issue", { method: "POST", body: JSON.stringify({}) });

export const requestPhysicalCard = (body = {}) =>
    request("/cards/physical/request", { method: "POST", body: JSON.stringify(body) });

export const blockCard = (cardType, body = {}) =>
    request(`/cards/${cardType}/block`, { method: "POST", body: JSON.stringify(body) });

export const updateCardLimits = (cardType, body) =>
    request(`/cards/${cardType}/limits`, { method: "PATCH", body: JSON.stringify(body) });
