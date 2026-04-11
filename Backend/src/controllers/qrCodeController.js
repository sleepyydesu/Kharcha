const { v4: uuidv4 } = require("uuid");
const supabase = require("../services/supabaseClient");
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

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
            return res.status(403).json({ success: false, message: "Only organization accounts can create dynamic QR codes." });
        }

        const { name, amount, note, callback_url, default_category_id } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: "name is required." });
        }

        // Validate callback_url if provided
        if (callback_url) {
            try { new URL(callback_url); } catch {
                return res.status(400).json({ success: false, message: "callback_url must be a valid URL." });
            }
        }

        const parsedAmount = amount ? parseFloat(amount) : null;
        if (parsedAmount !== null && (isNaN(parsedAmount) || parsedAmount <= 0)) {
            return res.status(400).json({ success: false, message: "amount must be a positive number or omitted." });
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
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
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
            return res.status(403).json({ success: false, message: "Organization accounts only." });
        }

        const { data: qrs, error } = await supabase
            .from("dynamic_qr_codes")
            .select("qr_id, name, amount, note, callback_url, default_category_id, is_active, created_at, updated_at")
            .eq("account_id", account_id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return res.status(200).json({ success: true, qr_codes: qrs || [] });
    } catch (err) {
        console.error("[listQRCodes]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
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
            return res.status(403).json({ success: false, message: "Organization accounts only." });
        }

        // Verify ownership
        const { data: existing, error: fetchErr } = await supabase
            .from("dynamic_qr_codes")
            .select("qr_id")
            .eq("qr_id", qr_id)
            .eq("account_id", account_id)
            .maybeSingle();

        if (fetchErr) throw fetchErr;
        if (!existing) return res.status(404).json({ success: false, message: "QR code not found." });

        const { name, amount, note, callback_url, default_category_id, is_active } = req.body;

        if (callback_url !== undefined && callback_url !== null && callback_url !== "") {
            try { new URL(callback_url); } catch {
                return res.status(400).json({ success: false, message: "callback_url must be a valid URL." });
            }
        }

        const parsedAmount = amount !== undefined ? (amount === null || amount === "" ? null : parseFloat(amount)) : undefined;
        if (parsedAmount !== undefined && parsedAmount !== null && (isNaN(parsedAmount) || parsedAmount <= 0)) {
            return res.status(400).json({ success: false, message: "amount must be a positive number or null." });
        }

        const updates = { updated_at: new Date().toISOString() };
        if (name !== undefined)                 updates.name = name.trim();
        if (parsedAmount !== undefined)         updates.amount = parsedAmount;
        if (note !== undefined)                 updates.note = note?.trim() || null;
        if (callback_url !== undefined)         updates.callback_url = callback_url?.trim() || null;
        if (default_category_id !== undefined)  updates.default_category_id = default_category_id || null;
        if (is_active !== undefined)            updates.is_active = Boolean(is_active);

        const { data: updated, error } = await supabase
            .from("dynamic_qr_codes")
            .update(updates)
            .eq("qr_id", qr_id)
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({ success: true, message: "QR code updated.", qr_code: updated });
    } catch (err) {
        console.error("[updateQRCode]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
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
            return res.status(403).json({ success: false, message: "Organization accounts only." });
        }

        const { data: existing, error: fetchErr } = await supabase
            .from("dynamic_qr_codes")
            .select("qr_id")
            .eq("qr_id", qr_id)
            .eq("account_id", account_id)
            .maybeSingle();

        if (fetchErr) throw fetchErr;
        if (!existing) return res.status(404).json({ success: false, message: "QR code not found." });

        const { error } = await supabase
            .from("dynamic_qr_codes")
            .delete()
            .eq("qr_id", qr_id);

        if (error) throw error;

        return res.status(200).json({ success: true, message: "QR code deleted." });
    } catch (err) {
        console.error("[deleteQRCode]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
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

        const { data: session } = await supabase
            .from("payment_sessions")
            .select("*")
            .eq("session_id", qr_id)
            .maybeSingle();

        if (session) {
            if (session.status !== "pending") {
                return res.status(410).json({ success: false, message: "Session expired or used" });
            }

            if (new Date(session.expires_at) < new Date()) {
                return res.status(410).json({ success: false, message: "Session expired" });
            }

            const { data: org } = await supabase
                .from("organizations")
                .select("organization_name")
                .eq("account_id", session.merchant_id)
                .maybeSingle();

            return res.json({
                success: true,
                qr: {
                    qr_id: session.session_id,
                    merchant: {
                        account_id: session.merchant_id,
                        name: org?.organization_name || "Merchant",
                    },
                    amount: session.amount,
                    note: session.note,
                },
            });
        }

        // ── Fall through: try api_keys (QR generated from an API key) ──
        const { data: key, error: keyErr } = await supabase
            .from("api_keys")
            .select("api_key_id, account_id, name, default_category_id, is_active")
            .eq("api_key_id", qr_id)
            .maybeSingle();

        if (keyErr) throw keyErr;
        if (!key) return res.status(404).json({ success: false, message: "QR code not found." });
        if (!key.is_active) return res.status(410).json({ success: false, message: "This QR code is no longer active." });

        const { data: org } = await supabase
            .from("organizations")
            .select("organization_name")
            .eq("account_id", key.account_id)
            .maybeSingle();

        let default_category = null;
        if (key.default_category_id) {
            const { data: cat } = await supabase
                .from("transaction_categories")
                .select("category_id, name, icon")
                .eq("category_id", key.default_category_id)
                .maybeSingle();
            default_category = cat || null;
        }

        return res.status(200).json({
            success: true,
            qr: {
                qr_id: key.api_key_id,
                merchant: { account_id: key.account_id, name: org?.organization_name || key.name },
                label: key.name,
                amount: null,      // API key QRs never have a fixed amount
                note: null,
                default_category,
            },
        });
    } catch (err) {
        console.error("[resolveQRCode]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
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
            headers: { "Content-Type": "application/json", "X-Kharcha-Event": "qr_payment" },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(8000),
        });
    } catch (err) {
        console.warn("[dispatchQRWebhook] Webhook delivery failed:", err.message);
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
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

        const session_id = uuidv4();

        const { error } = await supabase
            .from("payment_sessions")
            .insert({
                session_id,
                merchant_id: account_id,
                amount,
                note: note || null,
                status: "pending",
                expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 min
            });

        if (error) throw error;

        return res.json({
            success: true,
            session_id,
            qr_payload: JSON.stringify({
                kharcha_session_id: session_id,
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
            return res.status(400).json({ success: false, message: "Already paid" });
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

module.exports = { createQRCode, listQRCodes, updateQRCode, deleteQRCode, resolveQRCode, dispatchQRWebhook, createPaymentSession, completePayment };