/**
 * payPortalApi.js — Kharcha Payment Portal
 *
 * New 2-step flow:
 *   1. POST /:session_id/login       — verify email/phone + password or MPIN → OTP sent
 *   2. POST /:session_id/verify-otp  — verify OTP → payment processed immediately
 */

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function portalFetch(path, { headers: extraHeaders, ...rest } = {}) {
    const res = await fetch(`${BASE}/pay-portal${path}`, {
        headers: { "Content-Type": "application/json", ...extraHeaders },
        ...rest,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
}

export const getPortalSession = (sessionId) =>
    portalFetch(`/${sessionId}/session`);

/**
 * Step 1 — verify credentials, trigger OTP email.
 * credential_type is auto-detected on the server:
 *   all-digits ≤ 6 chars → MPIN, anything else → password.
 * Phone identifiers are normalised to +977XXXXXXXXXX server-side too,
 * but we also normalise on the client for consistency.
 */
export const portalLogin = (sessionId, identifier, credential) =>
    portalFetch(`/${sessionId}/login`, {
        method: "POST",
        body: JSON.stringify({ identifier, credential }),
    });

/** Step 2 — verify OTP and pay in one shot */
export const portalVerifyAndPay = (sessionId, otp, remarks) =>
    portalFetch(`/${sessionId}/verify-otp`, {
        method: "POST",
        body: JSON.stringify({ otp, remarks }),
    });

export const portalResendOTP = (sessionId) =>
    portalFetch(`/${sessionId}/resend-otp`, { method: "POST" });