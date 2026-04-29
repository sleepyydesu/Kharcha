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

    const res = await fetch(`${BASE}${path}`, {
        ...options,
        headers,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Request failed");

    return data;
}

// ── Auth ──────────────────────────────────────────────────────
export const signIn = (body) =>
    request("/auth/signin", { method: "POST", body: JSON.stringify(body) });

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
    request("/khalti/initiate", {
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

    if (params.type && params.type !== "all") q.set("type", params.type);
    if (params.category_id) q.set("category_id", params.category_id);
    if (params.start_date) q.set("start_date", params.start_date);
    if (params.end_date) q.set("end_date", params.end_date);
    if (params.page) q.set("page", params.page);
    if (params.limit) q.set("limit", params.limit);

    return request(`/transactions?${q.toString()}`);
};

export const getTransactionCategories = () =>
    request("/transactions/categories");

export const getTransactionById = (id) =>
    request(`/transactions/${encodeURIComponent(id)}`);

// ── Categories (Expense Tracker) ──────────────────────────────
export const getCategories = () => request("/categories");

export const createCategory = (body) =>
    request("/categories", { method: "POST", body: JSON.stringify(body) });

export const updateCategory = (id, body) =>
    request(`/categories/${id}`, { method: "PUT", body: JSON.stringify(body) });

export const deleteCategory = (id) =>
    request(`/categories/${id}`, { method: "DELETE" });

export const uploadCategoryIcon = (id, body) =>
    request(`/categories/${id}/icon`, {
        method: "POST",
        body: JSON.stringify(body),
    });

export const deleteCategoryIcon = (id) =>
    request(`/categories/${id}/icon`, { method: "DELETE" });

// ── KYC Verification ──────────────────────────────────────────
export const submitKYC = (body) =>
    request("/admin/verification/request", {
        method: "POST",
        body: JSON.stringify(body),
    });

// ── Auth — MPIN ───────────────────────────────────────────────
export const setupMpin = (body) =>
    request("/auth/mpin/setup", { method: "POST", body: JSON.stringify(body) });

export const changeMpin = (body) =>
    request("/auth/mpin/change", {
        method: "POST",
        body: JSON.stringify(body),
    });

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
    request(`/expenses/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });

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
    request("/org/api-keys", {
        method: "POST",
        body: JSON.stringify(body),
    });

export const updateApiKey = (id, body) =>
    request(`/org/api-keys/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
    });

export const revokeApiKey = (id) =>
    request(`/org/api-keys/${id}`, { method: "DELETE" });

// ── Dynamic QR Codes (org) ────────────────────────────────────
export const listOrgQRCodes = () => request("/org/qr-codes");

export const createOrgQRCode = (body) =>
    request("/org/qr-codes", {
        method: "POST",
        body: JSON.stringify(body),
    });

export const updateOrgQRCode = (id, body) =>
    request(`/org/qr-codes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
    });

export const deleteOrgQRCode = (id) =>
    request(`/org/qr-codes/${id}`, { method: "DELETE" });

// Public — resolve QR → payment details
export const resolveQRCode = (qr_id) => request(`/qr-codes/${qr_id}`);

// ── Payment Sessions (Dynamic QR payments) ────────────────────
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

// ── Kharcha Card ──────────────────────────────────────────────
// Fetch both virtual and physical cards in one call
export const getMyCards = () => request("/cards/my-cards");

// Issue a virtual (credit-card only) card instantly
export const issueVirtualCard = () =>
    request("/cards/virtual/issue", { method: "POST", body: JSON.stringify({}) });

// Request a physical (credit + RFID) card — needs admin approval
export const requestPhysicalCard = (body = {}) =>
    request("/cards/physical/request", { method: "POST", body: JSON.stringify(body) });

// Block a card by type: cardType = "virtual" | "physical"
export const blockCard = (cardType, body = {}) =>
    request(`/cards/${cardType}/block`, { method: "POST", body: JSON.stringify(body) });

// Update daily spend limit for a card type
export const updateCardLimits = (cardType, body) =>
    request(`/cards/${cardType}/limits`, { method: "PATCH", body: JSON.stringify(body) });