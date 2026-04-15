const { v4: uuidv4 } = require("uuid");
const supabase = require("../services/supabaseClient");
const fetch = (...args) =>
    import("node-fetch").then(({ default: f }) => f(...args));

// ─────────────────────────────────────────────────────────────
//  CREATE DYNAMIC QR CODE
//  POST /api/org/qr-codes
//  Body: { name, amount?, note?, callback_url? }
//  Only organization accounts.
// ─────────────────────────────────────────────────────────────
const createQRCode = async (req, res) => {
    try {
        const { account_id, account_type } = req.account;
        if (account_type !== "organization") {
            return res.status(403).json({
                success: false,
                message:
                    "Only organization accounts can create dynamic QR codes.",
            });
        }

        const { name, amount, note, callback_url, default_category_id } =
            req.body;

        if (!name || !name.trim()) {
            return res
                .status(400)
                .json({ success: false, message: "name is required." });
        }

        // Validate callback_url if provided
        if (callback_url) {
            try {
                new URL(callback_url);
            } catch {
                return res.status(400).json({
                    success: false,
                    message: "callback_url must be a valid URL.",
                });
            }
        }

        const parsedAmount = amount ? parseFloat(amount) : null;
        if (
            parsedAmount !== null &&
            (isNaN(parsedAmount) || parsedAmount <= 0)
        ) {
            return res.status(400).json({
                success: false,
                message: "amount must be a positive number or omitted.",
            });
        }

        const qr_id = uuidv4();

        const { data: qr, error } = await supabase
            .from("dynamic_qr_codes")
            .insert({
                qr_id,
                account_id,
                name: name.trim(),
                amount: parsedAmount,
                note: note?.trim() || null,
                callback_url: callback_url?.trim() || null,
                default_category_id: default_category_id || null,
                is_active: true,
            })
            .select()
            .single();

        if (error) throw error;

        return res.status(201).json({
            success: true,
            message: "Dynamic QR code created.",
            qr_code: qr,
            // The payload to embed in the actual QR image
            qr_payload: JSON.stringify({ kharcha_qr_id: qr_id }),
        });
    } catch (err) {
        console.error("[createQRCode]", err);
        return res.status(500).json({
            success: false,
            message: "Server error.",
            error: err.message,
        });
    }
};

// ─────────────────────────────────────────────────────────────
//  LIST QR CODES
//  GET /api/org/qr-codes
// ─────────────────────────────────────────────────────────────
const listQRCodes = async (req, res) => {
    try {
        const { account_id, account_type } = req.account;
        if (account_type !== "organization") {
            return res.status(403).json({
                success: false,
                message: "Organization accounts only.",
            });
        }

        const { data: qrs, error } = await supabase
            .from("dynamic_qr_codes")
            .select(
                "qr_id, name, amount, note, callback_url, default_category_id, is_active, created_at, updated_at",
            )
            .eq("account_id", account_id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return res.status(200).json({ success: true, qr_codes: qrs || [] });
    } catch (err) {
        console.error("[listQRCodes]", err);
        return res.status(500).json({
            success: false,
            message: "Server error.",
            error: err.message,
        });
    }
};

// ─────────────────────────────────────────────────────────────
//  UPDATE QR CODE
//  PATCH /api/org/qr-codes/:qr_id
//  Body: { name?, amount?, note?, callback_url?, default_category_id?, is_active? }
// ─────────────────────────────────────────────────────────────
const updateQRCode = async (req, res) => {
    try {
        const { account_id, account_type } = req.account;
        const { qr_id } = req.params;

        if (account_type !== "organization") {
            return res.status(403).json({
                success: false,
                message: "Organization accounts only.",
            });
        }

        // Verify ownership
        const { data: existing, error: fetchErr } = await supabase
            .from("dynamic_qr_codes")
            .select("qr_id")
            .eq("qr_id", qr_id)
            .eq("account_id", account_id)
            .maybeSingle();

        if (fetchErr) throw fetchErr;
        if (!existing)
            return res
                .status(404)
                .json({ success: false, message: "QR code not found." });

        const {
            name,
            amount,
            note,
            callback_url,
            default_category_id,
            is_active,
        } = req.body;

        if (
            callback_url !== undefined &&
            callback_url !== null &&
            callback_url !== ""
        ) {
            try {
                new URL(callback_url);
            } catch {
                return res.status(400).json({
                    success: false,
                    message: "callback_url must be a valid URL.",
                });
            }
        }

        const parsedAmount =
            amount !== undefined
                ? amount === null || amount === ""
                    ? null
                    : parseFloat(amount)
                : undefined;
        if (
            parsedAmount !== undefined &&
            parsedAmount !== null &&
            (isNaN(parsedAmount) || parsedAmount <= 0)
        ) {
            return res.status(400).json({
                success: false,
                message: "amount must be a positive number or null.",
            });
        }

        const updates = { updated_at: new Date().toISOString() };
        if (name !== undefined) updates.name = name.trim();
        if (parsedAmount !== undefined) updates.amount = parsedAmount;
        if (note !== undefined) updates.note = note?.trim() || null;
        if (callback_url !== undefined)
            updates.callback_url = callback_url?.trim() || null;
        if (default_category_id !== undefined)
            updates.default_category_id = default_category_id || null;
        if (is_active !== undefined) updates.is_active = Boolean(is_active);

        const { data: updated, error } = await supabase
            .from("dynamic_qr_codes")
            .update(updates)
            .eq("qr_id", qr_id)
            .select()
            .single();

        if (error) throw error;

        return res.json({
            success: true,
            message: "QR code updated.",
            qr: updated,
        });
    } catch (err) {
        console.error("[updateQRCode]", err);
        return res.status(500).json({
            success: false,
            message: "Server error.",
            error: err.message,
        });
    }
};

// ─────────────────────────────────────────────────────────────
//  DELETE QR CODE
//  DELETE /api/org/qr-codes/:qr_id
// ─────────────────────────────────────────────────────────────
const deleteQRCode = async (req, res) => {
    try {
        const { account_id, account_type } = req.account;
        const { qr_id } = req.params;

        if (account_type !== "organization") {
            return res.status(403).json({
                success: false,
                message: "Organization accounts only.",
            });
        }

        const { data: existing, error: fetchErr } = await supabase
            .from("dynamic_qr_codes")
            .select("qr_id")
            .eq("qr_id", qr_id)
            .eq("account_id", account_id)
            .maybeSingle();

        if (fetchErr) throw fetchErr;
        if (!existing)
            return res
                .status(404)
                .json({ success: false, message: "QR code not found." });

        const { error } = await supabase
            .from("dynamic_qr_codes")
            .delete()
            .eq("qr_id", qr_id);

        if (error) throw error;

        return res
            .status(200)
            .json({ success: true, message: "QR code deleted." });
    } catch (err) {
        console.error("[deleteQRCode]", err);
        return res.status(500).json({
            success: false,
            message: "Server error.",
            error: err.message,
        });
    }
};

// ─────────────────────────────────────────────────────────────
//  PUBLIC RESOLVE QR CODE
//  GET /api/qr-codes/:qr_id
//  No auth — called by scanner app to get payment details
// ─────────────────────────────────────────────────────────────
const resolveQRCode = async (req, res) => {
    try {
        const { qr_id } = req.params;

        // ── 1. Try dynamic_qr_codes (created by org via POST /api/org/qr-codes) ──
        // Error is intentionally ignored here: if the table doesn't exist yet
        // (migration pending), dynQR is simply null and we fall through to the
        // next lookup rather than crashing the entire resolve flow.
        const { data: dynQR } = await supabase
            .from("dynamic_qr_codes")
            .select(
                "qr_id, account_id, name, amount, note, default_category_id, is_active",
            )
            .eq("qr_id", qr_id)
            .maybeSingle();

        if (dynQR) {
            if (!dynQR.is_active) {
                return res.status(410).json({
                    success: false,
                    message: "This QR code is no longer active.",
                });
            }

            const { data: org } = await supabase
                .from("organizations")
                .select("organization_name", "phone_number")
                .eq("account_id", dynQR.account_id)
                .maybeSingle();

            let default_category = null;
            if (dynQR.default_category_id) {
                const { data: cat } = await supabase
                    .from("transaction_categories")
                    .select("category_id, name, icon_url, icon_type, color")
                    .eq("category_id", dynQR.default_category_id)
                    .maybeSingle();
                default_category = cat || null;
            }

            return res.status(200).json({
                success: true,
                qr: {
                    qr_id: dynQR.qr_id,
                    merchant: {
                        account_id: dynQR.account_id,
                        name: org?.organization_name || dynQR.name,
                        phone_number: org?.phone_number || null,
                    },
                    amount: dynQR.amount,
                    note: dynQR.note,
                    default_category,
                },
            });
        }

        // ── 2. Try payment_sessions (created per-transaction by POS) ──
        const { data: session } = await supabase
            .from("payment_sessions")
            .select("*")
            .eq("session_id", qr_id)
            .maybeSingle();

        if (session) {
            if (session.status !== "pending") {
                return res.status(410).json({
                    success: false,
                    message: "Session expired or used",
                });
            }

            const expiresMs = new Date(
                session.expires_at.endsWith("Z")
                    ? session.expires_at
                    : session.expires_at + "Z",
            ).getTime();
            if (expiresMs < Date.now()) {
                return res
                    .status(410)
                    .json({ success: false, message: "Session expired" });
            }

            const { data: org } = await supabase
                .from("organizations")
                .select("organization_name, phone_number")
                .eq("account_id", session.merchant_id)
                .maybeSingle();

            return res.json({
                success: true,
                qr: {
                    qr_id: session.session_id,
                    merchant: {
                        account_id: session.merchant_id,
                        name: org?.organization_name || "Merchant",
                        phone_number: org?.phone_number || null,
                    },
                    amount: session.amount,
                    note: session.note,
                },
            });
        }

        // ── 3. Try pos_checkout_sessions (created by POS via /api/pos/checkout) ──
        const { data: posSession } = await supabase
            .from("pos_checkout_sessions")
            .select("session_id, account_id, amount, note, reference_id, status, expires_at")
            .eq("session_id", qr_id)
            .maybeSingle();

        if (posSession) {
            if (new Date(posSession.expires_at) < new Date()) {
                return res.status(410).json({
                    success: false,
                    message: "Checkout session has expired.",
                });
            }
            if (posSession.status === "paid") {
                return res.status(410).json({
                    success: false,
                    message: "This session has already been paid.",
                });
            }
            if (posSession.status !== "pending") {
                return res.status(410).json({
                    success: false,
                    message: `Session is ${posSession.status}.`,
                });
            }

            const { data: org } = await supabase
                .from("organizations")
                .select("organization_name, phone_number")
                .eq("account_id", posSession.account_id)
                .maybeSingle();

            return res.status(200).json({
                success: true,
                qr: {
                    qr_id: posSession.session_id,
                    type: "pos_checkout",
                    merchant: {
                        account_id: posSession.account_id,
                        name: org?.organization_name || "Merchant",
                        phone_number: org?.phone_number || null,
                    },
                    amount: posSession.amount,
                    note: posSession.note,
                    reference_id: posSession.reference_id,
                    expires_at: posSession.expires_at,
                },
            });
        }

        // ── Fall through: try api_keys (QR generated from an API key) ──
        const { data: key, error: keyErr } = await supabase
            .from("api_keys")
            .select(
                "api_key_id, account_id, name, default_category_id, is_active",
            )
            .eq("api_key_id", qr_id)
            .maybeSingle();

        if (keyErr) throw keyErr;
        if (!key)
            return res
                .status(404)
                .json({ success: false, message: "QR code not found." });
        if (!key.is_active)
            return res.status(410).json({
                success: false,
                message: "This QR code is no longer active.",
            });

        const { data: org } = await supabase
            .from("organizations")
            .select("organization_name, phone_number")
            .eq("account_id", key.account_id)
            .maybeSingle();

        let default_category = null;
        if (key.default_category_id) {
            const { data: cat } = await supabase
                .from("transaction_categories")
                .select("category_id, name, icon_url, icon_type, color")
                .eq("category_id", key.default_category_id)
                .maybeSingle();
            default_category = cat || null;
        }

        return res.status(200).json({
            success: true,
            qr: {
                qr_id: key.api_key_id,
                merchant: {
                    account_id: key.account_id,
                    name: org?.organization_name || key.name,
                    phone_number: org?.phone_number || null,
                },
                label: key.name,
                amount: null, // API key QRs never have a fixed amount
                note: null,
                default_category,
            },
        });
    } catch (err) {
        console.error("[resolveQRCode]", err);
        return res.status(500).json({
            success: false,
            message: "Server error.",
            error: err.message,
        });
    }
};

// ─────────────────────────────────────────────────────────────
//  INTERNAL: dispatch webhook after a QR payment succeeds or fails
//  Fire-and-forget — never throws.
// ─────────────────────────────────────────────────────────────
async function dispatchQRWebhook(qr_id, payload) {
    try {
        // Try dynamic_qr_codes first, then fall back to api_keys
        let callback_url = null;

        const { data: qr } = await supabase
            .from("dynamic_qr_codes")
            .select("callback_url")
            .eq("qr_id", qr_id)
            .maybeSingle();

        if (qr?.callback_url) {
            callback_url = qr.callback_url;
        } else {
            const { data: key } = await supabase
                .from("api_keys")
                .select("callback_url")
                .eq("api_key_id", qr_id)
                .maybeSingle();
            callback_url = key?.callback_url || null;
        }

        if (!callback_url) return;

        await fetch(callback_url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Kharcha-Event": "qr_payment",
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(8000),
        });
    } catch (err) {
        console.warn(
            "[dispatchQRWebhook] Webhook delivery failed:",
            err.message,
        );
    }
}

// ─────────────────────────────────────────────
// CREATE PAYMENT SESSION (REAL DYNAMIC QR)
// POST /api/payments/create
// ─────────────────────────────────────────────
const createPaymentSession = async (req, res) => {
    try {
        const { account_id } = req.account;
        const { amount, note } = req.body;

        if (!amount || amount <= 0) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid amount" });
        }

        const session_id = uuidv4();

        const { error } = await supabase.from("payment_sessions").insert({
            session_id,
            merchant_id: account_id,
            amount,
            note: note || null,
            status: "pending",
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 mins
        });

        if (error) throw error;

        return res.json({
            success: true,
            session_id,
            qr_payload: JSON.stringify({
                kharcha_qr_id: session_id, // was kharcha_session_id — parseQR only recognises kharcha_qr_id
            }),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ─────────────────────────────────────────────
// COMPLETE PAYMENT
// POST /api/payments/complete
// ─────────────────────────────────────────────
const completePayment = async (req, res) => {
    try {
        const { session_id } = req.body;

        const { data: session } = await supabase
            .from("payment_sessions")
            .select("*")
            .eq("session_id", session_id)
            .maybeSingle();

        if (!session) {
            return res.status(404).json({ success: false });
        }

        if (session.status !== "pending") {
            return res
                .status(400)
                .json({ success: false, message: "Already paid" });
        }

        await supabase
            .from("payment_sessions")
            .update({ status: "success" })
            .eq("session_id", session_id);

        return res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
};

// ─────────────────────────────────────────────
// GET PAYMENT SESSION STATUS
// GET /api/org/qr-codes/payments/status/:session_id
// Authenticated — merchant polls this after showing the session QR.
// Returns { status: "pending" | "success" | "expired" } so the frontend
// can automatically show "Payment received!" without a manual refresh.
// ─────────────────────────────────────────────
const getPaymentSessionStatus = async (req, res) => {
    try {
        const { account_id } = req.account;
        const { session_id } = req.params;

        const { data: session, error } = await supabase
            .from("payment_sessions")
            .select("session_id, merchant_id, status, amount, expires_at")
            .eq("session_id", session_id)
            .maybeSingle();

        if (error) throw error;
        if (!session)
            return res
                .status(404)
                .json({ success: false, message: "Session not found." });

        // Only the merchant who created this session may poll it
        if (session.merchant_id !== account_id)
            return res
                .status(403)
                .json({ success: false, message: "Forbidden." });

        // Auto-expire if the time window has passed and it's still pending
        let { status } = session;
        if (status === "pending") {
            const expiresMs = new Date(
                session.expires_at.endsWith("Z")
                    ? session.expires_at
                    : session.expires_at + "Z",
            ).getTime();
            if (expiresMs < Date.now()) {
                status = "expired";
                await supabase
                    .from("payment_sessions")
                    .update({ status: "expired" })
                    .eq("session_id", session_id);
            }
        }

        return res.json({ success: true, status, amount: session.amount });
    } catch (err) {
        console.error("[getPaymentSessionStatus]", err);
        return res
            .status(500)
            .json({
                success: false,
                message: "Server error.",
                error: err.message,
            });
    }
};

module.exports = {
    createQRCode,
    listQRCodes,
    updateQRCode,
    deleteQRCode,
    resolveQRCode,
    dispatchQRWebhook,
    createPaymentSession,
    completePayment,
    getPaymentSessionStatus,
};