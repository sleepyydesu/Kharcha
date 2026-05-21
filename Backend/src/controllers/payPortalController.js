/**
 * payPortalController.js
 *
 * Standalone payment portal — separate from JWT auth and QR codes.
 *
 * Auth flow (2 steps):
 *   Step 1 — Login:  POST /:session_id/login
 *            Payer provides email/phone + password OR MPIN.
 *            Credentials are verified. If valid, OTP is sent to their email.
 *   Step 2 — Verify: POST /:session_id/verify-otp
 *            Payer submits the OTP. If valid, payment is processed immediately.
 *            No separate MPIN screen — credentials were already verified in Step 1.
 *
 * Other endpoints:
 *   POST /sessions/create       — merchant creates a session (X-API-Key)
 *   GET  /:session_id/session   — resolve session details (public)
 */

const crypto  = require("crypto");
const bcrypt  = require("bcrypt");
const supabase = require("../services/supabaseClient");
const { generateOTP } = require("../utils/otpUtils");
const { sendOTPEmail } = require("../utils/emailUtils");

// ── In-memory OTP store ────────────────────────────────────────
// key: session_id → { hash, account_id, email, expires, attempts }
// Replace with Redis in production for multi-process deployments.
const otpStore = new Map();

setInterval(() => {
    const now = Date.now();
    for (const [k, v] of otpStore) if (v.expires < now) otpStore.delete(k);
}, 5 * 60 * 1000);

// ─────────────────────────────────────────────────────────────
//  CREATE SESSION  (merchant backend — X-API-Key)
//  POST /api/pay-portal/sessions/create
// ─────────────────────────────────────────────────────────────
const createPortalSession = async (req, res) => {
    try {
        const { amount, note, return_url, callback_url, expires_in_minutes = 30 } = req.body;
        const account_id = req.apiKeyAccount;

        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({ success: false, message: "A valid amount (> 0) is required." });
        }

        const expiresAt = new Date(Date.now() + Math.min(expires_in_minutes, 1440) * 60 * 1000);

        const { data: session, error } = await supabase
            .from("payment_sessions")
            .insert({
                account_id,
                amount:       Number(amount),
                note:         note?.trim()         || null,
                return_url:   return_url?.trim()   || null,
                callback_url: callback_url?.trim() || null,
                expires_at:   expiresAt.toISOString(),
            })
            .select("session_id, amount, note, expires_at")
            .single();

        if (error) throw error;

        const baseUrl     = process.env.FRONTEND_URL || "https://kharcha.app";
        const checkoutUrl = new URL(`/pay/${session.session_id}`, baseUrl);
        if (return_url) checkoutUrl.searchParams.set("return_url", return_url);

        return res.status(201).json({
            success:      true,
            session_id:   session.session_id,
            checkout_url: checkoutUrl.toString(),
            amount:       session.amount,
            expires_at:   session.expires_at,
        });
    } catch (err) {
        console.error("[createPortalSession]", err);
        return res.status(500).json({ success: false, message: "Failed to create payment session." });
    }
};

// ─────────────────────────────────────────────────────────────
//  GET SESSION  (public)
//  GET /api/pay-portal/:session_id/session
// ─────────────────────────────────────────────────────────────
const getPortalSession = async (req, res) => {
    try {
        const { session_id } = req.params;

        const { data: session, error } = await supabase
            .from("payment_sessions")
            .select(`
                session_id, amount, note, status, expires_at, account_id,
                accounts!payment_sessions_account_id_fkey (
                    organizations ( organization_name )
                )
            `)
            .eq("session_id", session_id)
            .maybeSingle();

        if (error) throw error;
        if (!session)
            return res.status(404).json({ success: false, message: "Payment session not found." });
        if (session.status === "success")
            return res.status(410).json({ success: false, message: "This payment has already been completed." });
        if (session.status === "cancelled")
            return res.status(410).json({ success: false, message: "This payment session was cancelled." });
        if (session.status === "expired" || new Date(session.expires_at) < new Date())
            return res.status(410).json({ success: false, message: "This payment session has expired." });

        return res.status(200).json({
            success: true,
            session: {
                session_id:    session.session_id,
                merchant_name: session.accounts?.organizations?.organization_name || "Merchant",
                amount:        session.amount,
                note:          session.note,
                expires_at:    session.expires_at,
            },
        });
    } catch (err) {
        console.error("[getPortalSession]", err);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

// ─────────────────────────────────────────────────────────────
//  STEP 1 — LOGIN  (verify credentials → send OTP)
//  POST /api/pay-portal/:session_id/login
//  Body: { identifier, credential, credential_type }
//    identifier       — email address OR phone number
//    credential       — the user's password OR MPIN
//    credential_type  — "password" | "mpin"
// ─────────────────────────────────────────────────────────────
// ── Helpers ────────────────────────────────────────────────────
/**
 * Normalise a phone identifier to E.164 Nepal format (+977XXXXXXXXXX).
 * Returns the original string unchanged if it looks like an email.
 */
function normaliseIdentifier(raw) {
    const id = raw.trim();
    if (id.includes("@")) return id.toLowerCase(); // email — leave as-is

    // Strip everything except digits and leading +
    let digits = id.replace(/[\s\-().]/g, "");

    // Already has country code
    if (digits.startsWith("+977")) return digits;
    if (digits.startsWith("977"))  return `+${digits}`;

    // Strip a single leading zero (trunk prefix)
    if (digits.startsWith("0")) digits = digits.slice(1);

    return `+977${digits}`;
}

/**
 * Auto-detect credential type:
 *   - All digits AND ≤ 6 chars  →  "mpin"
 *   - Anything else             →  "password"
 */
function detectCredentialType(credential) {
    const c = credential.toString().trim();
    return /^\d{1,6}$/.test(c) ? "mpin" : "password";
}

const loginAndSendOTP = async (req, res) => {
    try {
        const { session_id } = req.params;
        const { identifier: rawIdentifier, credential } = req.body || {};

        if (!rawIdentifier?.trim() || !credential?.toString().trim()) {
            return res.status(400).json({ success: false, message: "Email/phone and credential are required." });
        }

        // Normalise the identifier and auto-detect credential type
        const identifier      = normaliseIdentifier(rawIdentifier);
        const credential_type = detectCredentialType(credential);

        // Validate session is still active
        const { data: session } = await supabase
            .from("payment_sessions")
            .select("session_id, status, expires_at, account_id")
            .eq("session_id", session_id)
            .maybeSingle();

        if (!session || session.status !== "pending") {
            return res.status(404).json({ success: false, message: "Payment session not found or is no longer active." });
        }
        if (new Date(session.expires_at) < new Date()) {
            return res.status(410).json({ success: false, message: "Payment session has expired." });
        }

        // Look up account by email OR phone number
        const isEmail     = identifier.includes("@");
        const lookupField = isEmail ? "email" : "phone_number";

        const { data: account } = await supabase
            .from("accounts")
            .select("account_id, email, phone_number, password_hash, mpin_hash, is_active")
            .eq(lookupField, identifier)
            .maybeSingle();

        // Generic response for not-found and bad credentials (prevent enumeration)
        const genericDeny = () => res.status(401).json({
            success: false,
            message: "Invalid credentials. Please check your details and try again.",
        });

        if (!account || !account.is_active) return genericDeny();

        // Verify credential against the auto-detected type
        let credentialValid = false;
        if (credential_type === "password") {
            if (!account.password_hash) return genericDeny();
            credentialValid = await bcrypt.compare(credential.toString(), account.password_hash);
        } else {
            // mpin
            if (!account.mpin_hash) {
                return res.status(403).json({
                    success: false,
                    message: "MPIN not set up. Please open the Kharcha app to configure your MPIN.",
                });
            }
            credentialValid = await bcrypt.compare(credential.toString().trim(), account.mpin_hash);
        }

        if (!credentialValid) return genericDeny();

        // Prevent self-payment
        if (account.account_id === session.account_id) {
            return res.status(400).json({ success: false, message: "You cannot pay yourself." });
        }

        // Rate-limit: block if OTP already issued in the last 60 seconds
        const existing = otpStore.get(session_id);
        if (existing && existing.expires - Date.now() > 14 * 60 * 1000) {
            return res.status(429).json({ success: false, message: "Please wait before requesting another OTP." });
        }

        // Generate and store OTP
        const otp  = generateOTP();
        const hash = await bcrypt.hash(otp, 10);

        otpStore.set(session_id, {
            hash,
            account_id: account.account_id,
            email:      account.email,
            expires:    Date.now() + 15 * 60 * 1000,
            attempts:   0,
        });

        await sendOTPEmail(account.email, otp, "payment");

        // Mask the email for the response
        const [local, domain] = account.email.split("@");
        const maskedEmail = `${local.slice(0, 2)}${"*".repeat(Math.max(2, local.length - 2))}@${domain}`;

        return res.status(200).json({
            success:      true,
            message:      "Credentials verified. An OTP has been sent to your email.",
            masked_email: maskedEmail,
        });
    } catch (err) {
        console.error("[loginAndSendOTP]", err);
        return res.status(500).json({ success: false, message: "Server error. Please try again." });
    }
};

// ─────────────────────────────────────────────────────────────
//  STEP 2 — VERIFY OTP + PROCESS PAYMENT  (single step)
//  POST /api/pay-portal/:session_id/verify-otp
//  Body: { otp, remarks? }
// ─────────────────────────────────────────────────────────────
const verifyOTPAndPay = async (req, res) => {
    try {
        const { session_id } = req.params;
        const { otp, remarks } = req.body || {};

        if (!otp?.toString().trim()) {
            return res.status(400).json({ success: false, message: "OTP is required." });
        }

        const stored = otpStore.get(session_id);
        if (!stored) {
            return res.status(401).json({ success: false, message: "OTP not found. Please log in again." });
        }
        if (stored.expires < Date.now()) {
            otpStore.delete(session_id);
            return res.status(401).json({ success: false, message: "OTP has expired. Please log in again." });
        }

        stored.attempts = (stored.attempts || 0) + 1;
        if (stored.attempts > 5) {
            otpStore.delete(session_id);
            return res.status(429).json({ success: false, message: "Too many incorrect attempts. Please log in again." });
        }

        const valid = await bcrypt.compare(otp.toString().trim(), stored.hash);
        if (!valid) {
            return res.status(401).json({ success: false, message: "Incorrect OTP. Please try again." });
        }

        // OTP is valid — fetch the payment session
        const { data: session } = await supabase
            .from("payment_sessions")
            .select("session_id, amount, account_id, status, expires_at, callback_url")
            .eq("session_id", session_id)
            .maybeSingle();

        if (!session || session.status !== "pending") {
            otpStore.delete(session_id);
            return res.status(404).json({ success: false, message: "Payment session not found or already used." });
        }
        if (new Date(session.expires_at) < new Date()) {
            otpStore.delete(session_id);
            return res.status(410).json({ success: false, message: "Payment session has expired." });
        }

        // Transfer funds
        const { data: result, error: transferErr } = await supabase.rpc("transfer_funds", {
            p_sender_account_id:   stored.account_id,
            p_receiver_account_id: session.account_id,
            p_amount:              Number(session.amount),
            p_remarks:             remarks?.trim() || "Kharcha Portal Payment",
        });

        if (transferErr) {
            const msg = transferErr.message || "";
            if (msg.includes("INSUFFICIENT_BALANCE"))
                return res.status(400).json({ success: false, message: "Insufficient wallet balance." });
            if (msg.includes("EXCEEDS_DAILY_LIMIT"))
                return res.status(400).json({ success: false, message: "Daily transaction limit exceeded." });
            throw transferErr;
        }

        // Mark session paid
        await supabase
            .from("payment_sessions")
            .update({
                status:         "success",
                transaction_id: result?.transaction_id || null,
                paid_by:        stored.account_id,
                paid_at:        new Date().toISOString(),
            })
            .eq("session_id", session_id);

        // Stamp the method so statements show "Kharcha Pay" instead of the
        // generic "Kharcha Wallet" that transfer_funds defaults to.
        if (result?.transaction_id) {
            await supabase
                .from("transactions")
                .update({ method: "Kharcha Pay" })
                .eq("transaction_id", result.transaction_id);
        }

        otpStore.delete(session_id);

        // Fire-and-forget webhook
        if (session.callback_url) {
            fetch(session.callback_url, {
                method:  "POST",
                headers: { "Content-Type": "application/json", "X-Kharcha-Event": "payment.success" },
                body:    JSON.stringify({
                    event:          "payment.success",
                    session_id,
                    transaction_id: result?.transaction_id,
                    amount:         Number(session.amount),
                    currency:       "NPR",
                    timestamp:      new Date().toISOString(),
                }),
                signal: AbortSignal.timeout(8000),
            }).catch(() => {});
        }

        return res.status(200).json({
            success: true,
            message: "Payment completed successfully.",
            transaction: {
                transaction_id: result?.transaction_id,
                amount:         Number(session.amount),
                currency:       "NPR",
                status:         "completed",
                processed_at:   new Date().toISOString(),
            },
        });
    } catch (err) {
        console.error("[verifyOTPAndPay]", err);
        return res.status(500).json({ success: false, message: "Payment processing failed. Please try again." });
    }
};

// ─────────────────────────────────────────────────────────────
//  RESEND OTP  (requires login to have been done first)
//  POST /api/pay-portal/:session_id/resend-otp
// ─────────────────────────────────────────────────────────────
const resendPortalOTP = async (req, res) => {
    try {
        const { session_id } = req.params;
        const stored = otpStore.get(session_id);

        if (!stored) {
            return res.status(401).json({
                success: false,
                message: "No active login session. Please log in again.",
            });
        }

        // Rate-limit resend: max once per 60s
        if (stored.expires - Date.now() > 14 * 60 * 1000) {
            return res.status(429).json({ success: false, message: "Please wait before requesting another OTP." });
        }

        const otp  = generateOTP();
        const hash = await bcrypt.hash(otp, 10);

        otpStore.set(session_id, {
            ...stored,
            hash,
            expires:  Date.now() + 15 * 60 * 1000,
            attempts: 0,
        });

        await sendOTPEmail(stored.email, otp, "payment");

        return res.status(200).json({ success: true, message: "A new OTP has been sent to your email." });
    } catch (err) {
        console.error("[resendPortalOTP]", err);
        return res.status(500).json({ success: false, message: "Failed to resend OTP." });
    }
};

const getSessionStatus = async (req, res) => {
    try {
        const { session_id } = req.params;
        const account_id = req.apiKeyAccount; // from verifyApiKey

        const { data: session, error } = await supabase
            .from("payment_sessions")
            .select("session_id, status, amount, paid_at, transaction_id, account_id")
            .eq("session_id", session_id)
            .maybeSingle();

        if (error) throw error;
        if (!session)
            return res.status(404).json({ success: false, message: "Session not found." });

        // Ensure only the org that created the session can query it
        if (session.account_id !== account_id)
            return res.status(403).json({ success: false, message: "Access denied." });

        return res.status(200).json({
            success: true,
            session_id:     session.session_id,
            status:         session.status,        // "pending" | "success" | "expired" | "cancelled"
            amount:         session.amount,
            transaction_id: session.transaction_id || null,
            paid_at:        session.paid_at || null,
        });
    } catch (err) {
        console.error("[getSessionStatus]", err);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

module.exports = {
    createPortalSession,
    getPortalSession,
    loginAndSendOTP,
    verifyOTPAndPay,
    resendPortalOTP,
    getSessionStatus,
};