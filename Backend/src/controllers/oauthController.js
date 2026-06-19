/**
 * oauthController.js
 *
 * Kharcha Linked-Account OAuth API
 *
 * Allows third-party apps (e.g. Foodmandu) to link a user's Kharcha wallet
 * and charge it later — without ever seeing the user's Kharcha credentials.
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  LINKING FLOW                                            │
 * │                                                          │
 * │  1. Foodmandu redirects user to:                         │
 * │     GET /api/oauth/authorize?client_id=...               │
 * │        &redirect_uri=...&state=...                       │
 * │                                                          │
 * │  2. Kharcha frontend shows login + consent screen.       │
 * │     (GET /api/oauth/authorize returns client info)       │
 * │                                                          │
 * │  3. User logs in (existing JWT auth) and confirms.       │
 * │     POST /api/oauth/authorize/complete  (JWT required)   │
 * │     → Kharcha redirects to redirect_uri?code=AUTH_CODE  │
 * │                                                          │
 * │  4. Foodmandu backend exchanges the code:                │
 * │     POST /api/oauth/token                                │
 * │     { client_id, client_secret, code }                   │
 * │     → { link_token }  (store this, it's long-lived)      │
 * └─────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  PAYMENT FLOW                                            │
 * │                                                          │
 * │  1. Foodmandu initiates payment:                         │
 * │     POST /api/oauth/pay/initiate                         │
 * │     Header: X-Client-Secret                              │
 * │     Body: { link_token, amount, note?, callback_url? }   │
 * │     → { payment_id, masked_email }                       │
 * │     (OTP sent to user's Kharcha email)                   │
 * │                                                          │
 * │  2. User enters OTP in Foodmandu's UI.                   │
 * │     POST /api/oauth/pay/confirm                          │
 * │     { payment_id, otp }                                  │
 * │     → { transaction_id, amount, status }                 │
 * └─────────────────────────────────────────────────────────┘
 */

const crypto   = require("crypto");
const bcrypt   = require("bcrypt");
const supabase = require("../services/supabaseClient");
const { generateOTP }    = require("../utils/otpUtils");
const { sendOTPEmail }   = require("../utils/emailUtils");

const SALT_ROUNDS         = 10;
const AUTH_CODE_TTL_MS    = 10 * 60 * 1000;   // 10 minutes
const PAYMENT_OTP_TTL_MS  = 15 * 60 * 1000;   // 15 minutes
const PAYMENT_MAX_ATTEMPTS = 5;

// auth codes:  code → { client_id, account_id, redirect_uri, expires, used }
const authCodeStore = new Map();

// payment OTPs: payment_id → { hash, authorization_id, account_id, client_id,
//                              email, amount, note, callback_url, expires, attempts }
const paymentOtpStore = new Map();

// Sweep expired entries every 5 minutes
const paymentCleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of authCodeStore)   if (v.expires < now) authCodeStore.delete(k);
    for (const [k, v] of paymentOtpStore) if (v.expires < now) paymentOtpStore.delete(k);
}, 5 * 60 * 1000);
paymentCleanupTimer.unref?.();

//  INTERNAL HELPERS
function generateClientSecret() {
    return `kh_cs_${crypto.randomBytes(32).toString("hex")}`;
}

function generateLinkToken() {
    return `kh_link_${crypto.randomBytes(32).toString("hex")}`;
}

function generateAuthCode() {
    return crypto.randomBytes(24).toString("hex");
}

function generatePaymentId() {
    return `khpay_${crypto.randomBytes(16).toString("hex")}`;
}

/** Verify X-Client-Secret header against a stored hash. */
async function resolveClient(clientId, rawSecret) {
    if (!clientId || !rawSecret) return { error: "client_id and client_secret are required." };
    if (!rawSecret.startsWith("kh_cs_")) return { error: "Invalid client_secret format." };

    const { data: client, error } = await supabase
        .from("oauth_clients")
        .select("client_id, name, client_secret_hash, redirect_uris, is_active")
        .eq("client_id", clientId)
        .maybeSingle();

    if (error || !client)      return { error: "Unknown client_id." };
    if (!client.is_active)     return { error: "This OAuth client has been deactivated." };

    const match = await bcrypt.compare(rawSecret, client.client_secret_hash);
    if (!match) return { error: "Invalid client_secret." };

    return { client };
}

/** Resolve a link_token to its authorization row. */
async function resolveLinkToken(rawToken) {
    if (!rawToken || !rawToken.startsWith("kh_link_")) return { error: "Invalid link_token format." };

    const prefix = rawToken.slice(0, 15); // "kh_link_" + 7 chars

    const { data: rows, error } = await supabase
        .from("oauth_authorizations")
        .select("authorization_id, client_id, account_id, link_token_hash, is_active")
        .eq("link_token_prefix", prefix)
        .eq("is_active", true);

    if (error || !rows?.length) return { error: "Invalid or revoked link_token." };

    let matched = null;
    for (const row of rows) {
        if (await bcrypt.compare(rawToken, row.link_token_hash)) { matched = row; break; }
    }
    if (!matched) return { error: "Invalid link_token." };

    return { authorization: matched };
}

//  1. REGISTER A CLIENT  (org API key)
//  POST /api/oauth/clients
//  Header: X-API-Key
//  Body: { name, redirect_uris: string[] }
const registerClient = async (req, res) => {
    try {
        const account_id = req.apiKeyAccount;
        const { name, redirect_uris } = req.body;

        // Verify the API key belongs to an organization account
        const { data: account, error: acctErr } = await supabase
            .from("accounts")
            .select("account_type")
            .eq("account_id", account_id)
            .maybeSingle();

        if (acctErr || !account) {
            return res.status(401).json({ success: false, message: "Could not resolve account for this API key." });
        }
        if (account.account_type !== "organization") {
            return res.status(403).json({
                success: false,
                message: "Only organization accounts can register OAuth clients.",
            });
        }

        if (!name?.trim()) {
            return res.status(400).json({ success: false, message: "Client name is required." });
        }

        if (!Array.isArray(redirect_uris) || redirect_uris.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one redirect_uri is required.",
            });
        }

        // Basic URI validation
        const validUris = redirect_uris.map((u) => u.trim()).filter((u) => {
            try { new URL(u); return true; } catch { return false; }
        });

        if (validUris.length !== redirect_uris.length) {
            return res.status(400).json({ success: false, message: "One or more redirect_uris are invalid." });
        }

        const rawSecret  = generateClientSecret();
        const secretHash = await bcrypt.hash(rawSecret, SALT_ROUNDS);

        const { data: client, error } = await supabase
            .from("oauth_clients")
            .insert({
                name:               name.trim(),
                client_secret_hash: secretHash,
                redirect_uris:      validUris,
                owner_account_id:   account_id,
            })
            .select("client_id, name, redirect_uris, created_at")
            .single();

        if (error) throw error;

        return res.status(201).json({
            success:       true,
            message:       "OAuth client registered. Copy the client_secret now — it will not be shown again.",
            client_id:     client.client_id,
            client_secret: rawSecret,
            name:          client.name,
            redirect_uris: client.redirect_uris,
            created_at:    client.created_at,
        });
    } catch (err) {
        console.error("[registerClient]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

//  2. GET CLIENT INFO FOR CONSENT SCREEN  (public)
//  GET /api/oauth/authorize?client_id=&redirect_uri=&state=
const getAuthorizeInfo = async (req, res) => {
    try {
        const { client_id, redirect_uri, state } = req.query;

        if (!client_id || !redirect_uri) {
            return res.status(400).json({
                success: false,
                message: "client_id and redirect_uri are required.",
            });
        }

        const { data: client, error } = await supabase
            .from("oauth_clients")
            .select("client_id, name, redirect_uris, is_active")
            .eq("client_id", client_id)
            .maybeSingle();

        if (error || !client) {
            return res.status(404).json({ success: false, message: "Unknown client_id." });
        }

        if (!client.is_active) {
            return res.status(403).json({ success: false, message: "This application has been deactivated." });
        }

        if (!client.redirect_uris.includes(redirect_uri)) {
            return res.status(400).json({
                success: false,
                message: "redirect_uri does not match the registered URIs for this client.",
            });
        }

        return res.status(200).json({
            success:      true,
            client: {
                client_id:    client.client_id,
                name:         client.name,
            },
            redirect_uri,
            state:        state || null,
            permissions: [
                "View your Kharcha wallet balance",
                "Initiate payments from your Kharcha wallet (requires OTP confirmation every time)",
            ],
        });
    } catch (err) {
        console.error("[getAuthorizeInfo]", err);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

//  3. COMPLETE AUTHORIZATION  (user confirms on Kharcha site)
//  POST /api/oauth/authorize/complete
//  Auth: JWT (logged-in Kharcha user)
//  Body: { client_id, redirect_uri, state? }
//  → Redirects to redirect_uri?code=AUTH_CODE&state=...
const completeAuthorization = async (req, res) => {
    try {
        const { account_id } = req.account;
        const { client_id, redirect_uri, state } = req.body;

        if (!client_id || !redirect_uri) {
            return res.status(400).json({ success: false, message: "client_id and redirect_uri are required." });
        }

        // Validate client + redirect_uri
        const { data: client, error } = await supabase
            .from("oauth_clients")
            .select("client_id, name, redirect_uris, is_active")
            .eq("client_id", client_id)
            .maybeSingle();

        if (error || !client || !client.is_active) {
            return res.status(404).json({ success: false, message: "Unknown or inactive client." });
        }

        if (!client.redirect_uris.includes(redirect_uri)) {
            return res.status(400).json({ success: false, message: "Invalid redirect_uri." });
        }

        // Generate a one-time auth code (10-minute TTL)
        const code = generateAuthCode();
        authCodeStore.set(code, {
            client_id,
            account_id,
            redirect_uri,
            expires: Date.now() + AUTH_CODE_TTL_MS,
            used:    false,
        });

        // Build the redirect URL
        const redirectUrl = new URL(redirect_uri);
        redirectUrl.searchParams.set("code",  code);
        if (state) redirectUrl.searchParams.set("state", state);

        return res.status(200).json({
            success:      true,
            redirect_url: redirectUrl.toString(),
        });
    } catch (err) {
        console.error("[completeAuthorization]", err);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

//  4. EXCHANGE AUTH CODE FOR LINK TOKEN  (third-party backend)
//  POST /api/oauth/token
//  Body: { client_id, client_secret, code }
//  → { link_token }  (stored by the third party for future payments)
const exchangeToken = async (req, res) => {
    try {
        const { client_id, client_secret, code } = req.body;

        if (!code) {
            return res.status(400).json({ success: false, message: "Authorization code is required." });
        }

        // Verify client credentials
        const { client, error: clientError } = await resolveClient(client_id, client_secret);
        if (clientError) {
            return res.status(401).json({ success: false, message: clientError });
        }

        // Validate the auth code
        const stored = authCodeStore.get(code);
        if (!stored) {
            return res.status(401).json({ success: false, message: "Invalid or expired authorization code." });
        }
        if (stored.used) {
            return res.status(401).json({ success: false, message: "Authorization code has already been used." });
        }
        if (stored.expires < Date.now()) {
            authCodeStore.delete(code);
            return res.status(401).json({ success: false, message: "Authorization code has expired." });
        }
        if (stored.client_id !== client_id) {
            return res.status(401).json({ success: false, message: "Authorization code does not belong to this client." });
        }

        // Mark code as used (one-time use)
        stored.used = true;

        // Generate a persistent link_token
        const rawToken  = generateLinkToken();
        const tokenHash = await bcrypt.hash(rawToken, SALT_ROUNDS);
        const tokenPrefix = rawToken.slice(0, 15); // "kh_link_" + 7 chars

        const { data: authorization, error } = await supabase
            .from("oauth_authorizations")
            .insert({
                client_id:         client.client_id,
                account_id:        stored.account_id,
                link_token_hash:   tokenHash,
                link_token_prefix: tokenPrefix,
            })
            .select("authorization_id, created_at")
            .single();

        if (error) throw error;

        // Clean up the used code
        authCodeStore.delete(code);

        return res.status(200).json({
            success:          true,
            link_token:       rawToken,
            authorization_id: authorization.authorization_id,
            token_type:       "kharcha_link",
            message:          "Store this link_token securely. Use it to initiate payments on behalf of this user.",
        });
    } catch (err) {
        console.error("[exchangeToken]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

//  5. INITIATE PAYMENT  (third-party backend)
//  POST /api/oauth/pay/initiate
//  Header: X-Client-Id, X-Client-Secret
//  Body: { link_token, amount, note?, callback_url? }
//  → { payment_id, masked_email }
//  (OTP is sent to the user's Kharcha email)
const initiatePayment = async (req, res) => {
    try {
        const clientId     = req.headers["x-client-id"];
        const clientSecret = req.headers["x-client-secret"];
        const { link_token, amount, note, callback_url } = req.body;

        // Validate inputs
        if (!link_token || !amount) {
            return res.status(400).json({ success: false, message: "link_token and amount are required." });
        }
        if (isNaN(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({ success: false, message: "Amount must be a positive number." });
        }

        // Verify client credentials
        const { client, error: clientError } = await resolveClient(clientId, clientSecret);
        if (clientError) {
            return res.status(401).json({ success: false, message: clientError });
        }

        // Resolve the link token
        const { authorization, error: tokenError } = await resolveLinkToken(link_token);
        if (tokenError) {
            return res.status(401).json({ success: false, message: tokenError });
        }

        // Ensure the token belongs to this client
        if (authorization.client_id !== client.client_id) {
            return res.status(403).json({ success: false, message: "link_token does not belong to this client." });
        }

        // Fetch the user's account
        const { data: account, error: accountError } = await supabase
            .from("accounts")
            .select("account_id, email, is_active")
            .eq("account_id", authorization.account_id)
            .maybeSingle();

        if (accountError || !account || !account.is_active) {
            return res.status(404).json({ success: false, message: "Linked user account not found or inactive." });
        }

        // Generate OTP and payment ID
        const paymentId = generatePaymentId();
        const otp       = generateOTP();
        const otpHash   = await bcrypt.hash(otp, SALT_ROUNDS);

        paymentOtpStore.set(paymentId, {
            hash:             otpHash,
            authorization_id: authorization.authorization_id,
            account_id:       account.account_id,
            client_id:        client.client_id,
            email:            account.email,
            amount:           Number(amount),
            note:             note?.trim() || null,
            callback_url:     callback_url?.trim() || null,
            expires:          Date.now() + PAYMENT_OTP_TTL_MS,
            attempts:         0,
        });

        // Send OTP to user's Kharcha email
        await sendOTPEmail(account.email, otp, "payment");

        // Mask email for response
        const [local, domain] = account.email.split("@");
        const maskedEmail     = `${local.slice(0, 2)}${"*".repeat(Math.max(2, local.length - 2))}@${domain}`;

        // Update last_used_at on the authorization (non-blocking)
        supabase
            .from("oauth_authorizations")
            .update({ last_used_at: new Date().toISOString() })
            .eq("authorization_id", authorization.authorization_id)
            .then(() => {});

        return res.status(200).json({
            success:      true,
            payment_id:   paymentId,
            masked_email: maskedEmail,
            amount:       Number(amount),
            currency:     "NPR",
            expires_in:   Math.floor(PAYMENT_OTP_TTL_MS / 1000),
            message:      `An OTP has been sent to the user's registered email. Ask the user to enter it to confirm.`,
        });
    } catch (err) {
        console.error("[initiatePayment]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

//  6. CONFIRM PAYMENT  (third-party backend, after user enters OTP)
//  POST /api/oauth/pay/confirm
//  Body: { payment_id, otp }
//  → { transaction_id, amount, status }
const confirmPayment = async (req, res) => {
    try {
        const { payment_id, otp } = req.body;

        if (!payment_id || !otp?.toString().trim()) {
            return res.status(400).json({ success: false, message: "payment_id and otp are required." });
        }

        const stored = paymentOtpStore.get(payment_id);
        if (!stored) {
            return res.status(401).json({ success: false, message: "Payment not found. Please initiate a new payment." });
        }
        if (stored.expires < Date.now()) {
            paymentOtpStore.delete(payment_id);
            return res.status(401).json({ success: false, message: "OTP has expired. Please initiate a new payment." });
        }

        stored.attempts = (stored.attempts || 0) + 1;
        if (stored.attempts > PAYMENT_MAX_ATTEMPTS) {
            paymentOtpStore.delete(payment_id);
            return res.status(429).json({
                success: false,
                message: "Too many incorrect OTP attempts. Please initiate a new payment.",
            });
        }

        const valid = await bcrypt.compare(otp.toString().trim(), stored.hash);
        if (!valid) {
            const remaining = PAYMENT_MAX_ATTEMPTS - stored.attempts;
            return res.status(401).json({
                success:   false,
                message:   `Incorrect OTP. ${remaining} attempt(s) remaining.`,
                attempts_remaining: remaining,
            });
        }

        // Fetch the merchant (client's owner account) to credit
        const { data: clientRow, error: clientErr } = await supabase
            .from("oauth_clients")
            .select("owner_account_id")
            .eq("client_id", stored.client_id)
            .maybeSingle();

        if (clientErr || !clientRow) throw new Error("OAuth client not found during payment.");

        // Transfer funds: Kharcha user → merchant's Kharcha account
        const { data: result, error: transferErr } = await supabase.rpc("transfer_funds", {
            p_sender_account_id:   stored.account_id,
            p_receiver_account_id: clientRow.owner_account_id,
            p_amount:              stored.amount,
            p_remarks:             stored.note || `Kharcha OAuth Payment`,
        });

        if (transferErr) {
            const msg = transferErr.message || "";
            if (msg.includes("INSUFFICIENT_BALANCE"))
                return res.status(400).json({ success: false, message: "Insufficient wallet balance." });
            if (msg.includes("EXCEEDS_DAILY_LIMIT"))
                return res.status(400).json({ success: false, message: "Daily transaction limit exceeded." });
            throw transferErr;
        }

        paymentOtpStore.delete(payment_id);

        const transactionId = result?.transaction_id || null;
        const processedAt   = new Date().toISOString();

        // Stamp the method so statements show "Linked Account" instead of the
        // generic "Kharcha Wallet" that transfer_funds defaults to.
        if (transactionId) {
            await supabase
                .from("transactions")
                .update({ method: "Linked Account" })
                .eq("transaction_id", transactionId);
        }

        // Fire-and-forget webhook to the third party
        if (stored.callback_url) {
            fetch(stored.callback_url, {
                method:  "POST",
                headers: {
                    "Content-Type":    "application/json",
                    "X-Kharcha-Event": "oauth_payment.success",
                },
                body: JSON.stringify({
                    event:          "oauth_payment.success",
                    payment_id,
                    transaction_id: transactionId,
                    amount:         stored.amount,
                    currency:       "NPR",
                    timestamp:      processedAt,
                }),
                signal: AbortSignal.timeout(8000),
            }).catch(() => {});
        }

        return res.status(200).json({
            success: true,
            message: "Payment completed successfully.",
            transaction: {
                transaction_id: transactionId,
                payment_id,
                amount:         stored.amount,
                currency:       "NPR",
                method:         "Linked Account",
                status:         "completed",
                processed_at:   processedAt,
            },
            // Store transaction_id — pass it to POST /api/payment/refund
            // with your X-API-Key if you ever need to issue a refund.
            refund_hint: "To refund this payment, call POST /api/payment/refund with this transaction_id and your X-API-Key.",
        });
    } catch (err) {
        console.error("[confirmPayment]", err);
        return res.status(500).json({ success: false, message: "Payment processing failed. Please try again." });
    }
};

//  7. LIST LINKED APPS  (Kharcha user — their own linked apps)
//  GET /api/oauth/my-linked-apps
//  Auth: JWT
const listLinkedApps = async (req, res) => {
    try {
        const { account_id } = req.account;

        const { data: authorizations, error } = await supabase
            .from("oauth_authorizations")
            .select(`
                authorization_id, created_at, last_used_at, is_active,
                oauth_clients ( client_id, name )
            `)
            .eq("account_id", account_id)
            .eq("is_active", true)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return res.status(200).json({
            success: true,
            linked_apps: (authorizations || []).map((a) => ({
                authorization_id: a.authorization_id,
                app_name:         a.oauth_clients?.name || "Unknown App",
                client_id:        a.oauth_clients?.client_id,
                linked_at:        a.created_at,
                last_used_at:     a.last_used_at,
            })),
        });
    } catch (err) {
        console.error("[listLinkedApps]", err);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

//  8. REVOKE A LINKED APP  (Kharcha user)
//  DELETE /api/oauth/my-linked-apps/:authorization_id
//  Auth: JWT
const revokeLinkedApp = async (req, res) => {
    try {
        const { account_id } = req.account;
        const { authorization_id } = req.params;

        const { data: auth, error: fetchErr } = await supabase
            .from("oauth_authorizations")
            .select("authorization_id, account_id")
            .eq("authorization_id", authorization_id)
            .eq("account_id", account_id)
            .maybeSingle();

        if (fetchErr) throw fetchErr;
        if (!auth) {
            return res.status(404).json({ success: false, message: "Linked app not found." });
        }

        const { error } = await supabase
            .from("oauth_authorizations")
            .update({ is_active: false })
            .eq("authorization_id", authorization_id);

        if (error) throw error;

        return res.status(200).json({
            success: true,
            message: "App unlinked successfully. It can no longer charge your Kharcha wallet.",
        });
    } catch (err) {
        console.error("[revokeLinkedApp]", err);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

//  9. LIST MY OAUTH CLIENTS  (org API key)
//  GET /api/oauth/clients
//  Header: X-API-Key
const listClients = async (req, res) => {
    try {
        const account_id = req.apiKeyAccount;

        const { data: account, error: acctErr } = await supabase
            .from("accounts")
            .select("account_type")
            .eq("account_id", account_id)
            .maybeSingle();

        if (acctErr || !account) {
            return res.status(401).json({ success: false, message: "Could not resolve account for this API key." });
        }
        if (account.account_type !== "organization") {
            return res.status(403).json({ success: false, message: "Organization accounts only." });
        }

        const { data: clients, error } = await supabase
            .from("oauth_clients")
            .select("client_id, name, redirect_uris, is_active, created_at")
            .eq("owner_account_id", account_id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return res.status(200).json({ success: true, clients: clients || [] });
    } catch (err) {
        console.error("[listClients]", err);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

//  10. REVOKE A CLIENT  (org API key)
//  DELETE /api/oauth/clients/:client_id
//  Header: X-API-Key
const revokeClient = async (req, res) => {
    try {
        const account_id = req.apiKeyAccount;
        const { client_id } = req.params;

        const { data: account, error: acctErr } = await supabase
            .from("accounts")
            .select("account_type")
            .eq("account_id", account_id)
            .maybeSingle();

        if (acctErr || !account) {
            return res.status(401).json({ success: false, message: "Could not resolve account for this API key." });
        }
        if (account.account_type !== "organization") {
            return res.status(403).json({ success: false, message: "Organization accounts only." });
        }

        const { data: client, error: fetchErr } = await supabase
            .from("oauth_clients")
            .select("client_id")
            .eq("client_id", client_id)
            .eq("owner_account_id", account_id)
            .maybeSingle();

        if (fetchErr) throw fetchErr;
        if (!client) return res.status(404).json({ success: false, message: "Client not found." });

        // Deactivate client and all its authorizations
        await supabase.from("oauth_clients").update({ is_active: false }).eq("client_id", client_id);
        await supabase.from("oauth_authorizations").update({ is_active: false }).eq("client_id", client_id);

        return res.status(200).json({
            success: true,
            message: "OAuth client revoked. All linked user accounts for this client have been disconnected.",
        });
    } catch (err) {
        console.error("[revokeClient]", err);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

module.exports = {
    registerClient,
    getAuthorizeInfo,
    completeAuthorization,
    exchangeToken,
    initiatePayment,
    confirmPayment,
    listLinkedApps,
    revokeLinkedApp,
    listClients,
    revokeClient,
};
