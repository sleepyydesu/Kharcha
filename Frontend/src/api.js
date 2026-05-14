import axios from "axios";

/**
 * api.js — Axios instance with automatic silent token refresh.
 *
 * Auth flow (cookie-based):
 *  • Access token lives in an httpOnly cookie (kharcha_access) — 15 min TTL.
 *  • Refresh token lives in a separate httpOnly cookie (kharcha_refresh) — 7 day absolute TTL
 *    with a 30-min inactivity window enforced server-side.
 *  • JS never touches either cookie. The browser sends them automatically on
 *    same-site requests; withCredentials: true makes cross-origin requests send them too.
 *
 * On 401:
 *  1. POST /api/auth/refresh (sends kharcha_refresh cookie automatically).
 *  2. If the server issues new cookies, retry the original request once.
 *  3. If /refresh itself returns 401 (session expired / idle too long),
 *     fire an "auth:expired" event so the app can redirect to login.
 */

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
    baseURL:         BASE_URL,
    timeout:         10000,
    withCredentials: true,       // required for cross-origin cookie support
    headers:         { "Content-Type": "application/json" },
});

// ── Refresh state ─────────────────────────────────────────────
// Track whether a refresh is already in-flight so concurrent 401s
// share the same refresh request instead of firing several in parallel.
let isRefreshing   = false;
let refreshWaiters = []; // array of { resolve, reject }

function onRefreshSuccess() {
    refreshWaiters.forEach(({ resolve }) => resolve());
    refreshWaiters = [];
}

function onRefreshFailure(err) {
    refreshWaiters.forEach(({ reject }) => reject(err));
    refreshWaiters = [];
}

function waitForRefresh() {
    return new Promise((resolve, reject) => {
        refreshWaiters.push({ resolve, reject });
    });
}

// ── Response interceptor ──────────────────────────────────────
api.interceptors.response.use(
    // Pass through successful responses unchanged.
    (response) => response,

    async (error) => {
        const originalRequest = error.config;

        // Only intercept 401s that haven't already been retried.
        if (error.response?.status !== 401 || originalRequest._retried) {
            return Promise.reject(error);
        }

        // Don't try to refresh if the 401 came FROM the refresh endpoint itself —
        // that means the session is genuinely expired.
        if (originalRequest.url?.includes("/auth/refresh")) {
            window.dispatchEvent(new CustomEvent("auth:expired"));
            return Promise.reject(error);
        }

        // If a refresh is already in-flight, queue this request behind it.
        if (isRefreshing) {
            try {
                await waitForRefresh();
                originalRequest._retried = true;
                return api(originalRequest);
            } catch {
                return Promise.reject(error);
            }
        }

        // Start the refresh flow.
        isRefreshing = true;
        originalRequest._retried = true;

        try {
            // Cookies are sent automatically — no body or headers needed.
            await api.post("/auth/refresh");
            isRefreshing = false;
            onRefreshSuccess();

            // Retry the original failed request now that we have fresh cookies.
            return api(originalRequest);
        } catch (refreshError) {
            isRefreshing = false;
            onRefreshFailure(refreshError);

            // Session is gone — tell the app to redirect to login.
            window.dispatchEvent(new CustomEvent("auth:expired"));
            return Promise.reject(refreshError);
        }
    },
);

export default api;
