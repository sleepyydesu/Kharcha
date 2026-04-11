const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const supabase = require("../services/supabaseClient");
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

async function resolveApiKey(rawKey) {
    if (!rawKey || !rawKey.startsWith("kh_live_")) {
        return { error: "Invalid API key format." };
    }
    const keyPrefix = rawKey.slice(0, 12);
    const { data: candidates, error } = await supabase
        .from("api_keys")
        .select("api_key_id, account_id, key_hash, is_active, expires_at")
        .eq("key_prefix", keyPrefix)
        .eq("is_active", true);

    if (error || !candidates || candidates.length === 0) return { error: "Invalid or revoked API key." };

    let matched = null;
    for (const candidate of candidates) {
        const ok = await bcrypt.compare(rawKey, candidate.key_hash);
        if (ok) { matched = candidate; break; }
    }
    if (!matched) return { error: "Invalid API key." };
    if (matched.expires_at && new Date(matched.expires_at) < new Date()) return { error: "API key has expired." };

    supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("api_key_id", matched.api_key_id).then(() => {});
    return { apiKey: matched };
}

async function dispatchCheckoutWebhook(session, txId) {
    if (!session.callback_url) return;
    try {
        await fetch(session.callback_url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Kharcha-Event": "checkout_paid" },
            body: JSON.stringify({
                event: "checkout_paid",
                session_id: session.session_id,
                reference_id: session.reference_id || null,
                amount: session.amount,
                transaction_id: txId,
                paid_at: new Date().toISOString(),
            }),
            signal: AbortSignal.timeout(8000),
        });
    } catch (err) {
        console.warn("[dispatchCheckoutWebhook] Webhook delivery failed:", err.message);
    }
}

// POST /api/pos/charge  (existing RFID card tap)
const posCharge = async (req, res) => {
    try {
        const rawKey = req.headers["x-api-key"];
        const { card_id, amount, remarks } = req.body;
        const { apiKey, error: keyError } = await resolveApiKey(rawKey);
        if (keyError) return res.status(401).json({ success: false, message: keyError });
        if (!card_id) return res.status(400).json({ success: false, message: "card_id is required." });
        const parsedAmount = parseFloat(amount);
        if (!amount || isNaN(parsedAmount) || parsedAmount < 1) {
            return res.status(400).json({ success: false, message: "amount must be a positive number (min NPR 1)." });
        }
        const { data: card, error: cardError } = await supabase
            .from("physical_cards").select("card_id, account_id, status, daily_limit")
            .eq("card_id", card_id.toUpperCase()).maybeSingle();
        if (cardError) throw cardError;
        if (!card) return res.status(404).json({ success: false, message: "Card not found." });
        if (card.status !== "active") {
            const msgs = { pending: "Card not activated yet.", blocked: "Card is blocked.", expired: "Card has expired." };
            return res.status(403).json({ success: false, message: msgs[card.status] || "Card is not active." });
        }
        const { data: receiverAccount, error: receiverError } = await supabase
            .from("accounts").select("account_id, account_type, is_active")
            .eq("account_id", apiKey.account_id).maybeSingle();
        if (receiverError) throw receiverError;
        if (!receiverAccount || !receiverAccount.is_active) {
            return res.status(400).json({ success: false, message: "Merchant account is inactive." });
        }
        if (card.account_id === receiverAccount.account_id) {
            return res.status(400).json({ success: false, message: "Cannot charge your own account." });
        }
        const { data: result, error: chargeError } = await supabase.rpc("pos_charge_funds", {
            p_card_id: card_id.toUpperCase(),
            p_receiver_account_id: receiverAccount.account_id,
            p_amount: parsedAmount,
            p_remarks: remarks || null,
        });
        if (chargeError) {
            const msg = chargeError.message || "";
            if (msg.includes("CARD_INACTIVE"))         return res.status(403).json({ success: false, message: "Card is not active." });
            if (msg.includes("INSUFFICIENT_BALANCE"))  return res.status(400).json({ success: false, message: "Insufficient wallet balance." });
            if (msg.includes("EXCEEDS_DAILY_LIMIT"))   return res.status(400).json({ success: false, message: "Card daily limit reached." });
            if (msg.includes("WALLET_NOT_FOUND"))      return res.status(400).json({ success: false, message: "Wallet not found." });
            if (msg.includes("RECEIVER_WALLET_NOT_FOUND")) return res.status(400).json({ success: false, message: "Merchant wallet not found." });
            throw chargeError;
        }
        const { data: merchantProfile } = await supabase.from("organizations").select("organization_name").eq("account_id", receiverAccount.account_id).maybeSingle();
        return res.status(200).json({
            success: true,
            message: "Payment successful.",
            transaction: {
                transaction_id: result.transaction_id,
                amount: parsedAmount,
                currency: "NPR",
                balance_after: parseFloat(result.sender_balance_after),
                merchant: { account_id: receiverAccount.account_id, display_name: merchantProfile?.organization_name || "Merchant" },
                remarks: remarks || null,
                method: "Kharcha Card",
                status: "completed",
            },
        });
    } catch (err) {
        console.error("[posCharge]", err);
        return res.status(500).json({ success: false, message: "Charge failed.", error: err.message });
    }
};

// POST /api/pos/checkout
// Create a QR checkout session. Requires X-API-Key header.
// Body: { amount, note?, reference_id?, callback_url? }
const createCheckout = async (req, res) => {
    try {
        const rawKey = req.headers["x-api-key"];
        const { amount, note, reference_id, callback_url } = req.body;

        const { apiKey, error: keyError } = await resolveApiKey(rawKey);
        if (keyError) return res.status(401).json({ success: false, message: keyError });

        const parsedAmount = parseFloat(amount);
        if (!amount || isNaN(parsedAmount) || parsedAmount < 1) {
            return res.status(400).json({ success: false, message: "amount must be a positive number (min NPR 1)." });
        }
        if (callback_url) {
            try { new URL(callback_url); }
            catch { return res.status(400).json({ success: false, message: "callback_url must be a valid URL." }); }
        }

        const { data: org } = await supabase.from("organizations").select("organization_name").eq("account_id", apiKey.account_id).maybeSingle();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        const { data: session, error } = await supabase
            .from("pos_checkout_sessions")
            .insert({
                account_id:   apiKey.account_id,
                api_key_id:   apiKey.api_key_id,
                amount:       parsedAmount,
                note:         note?.trim() || null,
                reference_id: reference_id?.trim() || null,
                callback_url: callback_url?.trim() || null,
                status:       "pending",
                expires_at:   expiresAt,
            })
            .select("session_id, amount, note, reference_id, status, expires_at, created_at")
            .single();

        if (error) throw error;

        return res.status(201).json({
            success: true,
            message: "Checkout session created. Embed qr_payload in a QR code for the customer to scan.",
            session: {
                session_id:   session.session_id,
                amount:       session.amount,
                note:         session.note,
                reference_id: session.reference_id,
                status:       session.status,
                expires_at:   session.expires_at,
                merchant:     org?.organization_name || "Merchant",
            },
            qr_payload: JSON.stringify({ kharcha_checkout: session.session_id }),
        });
    } catch (err) {
        console.error("[createCheckout]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

// GET /api/pos/checkout/:session_id  (public — Kharcha scanner)
const resolveCheckout = async (req, res) => {
    try {
        const { session_id } = req.params;
        const { data: session, error } = await supabase
            .from("pos_checkout_sessions")
            .select("session_id, account_id, amount, note, reference_id, status, expires_at")
            .eq("session_id", session_id)
            .maybeSingle();

        if (error) throw error;
        if (!session) return res.status(404).json({ success: false, message: "Checkout session not found." });
        if (new Date(session.expires_at) < new Date()) {
            if (session.status === "pending") await supabase.from("pos_checkout_sessions").update({ status: "expired" }).eq("session_id", session_id);
            return res.status(410).json({ success: false, message: "Checkout session has expired.", status: "expired" });
        }
        if (session.status === "paid")    return res.status(200).json({ success: true, status: "paid", message: "Already paid." });
        if (session.status !== "pending") return res.status(410).json({ success: false, status: session.status, message: `Session is ${session.status}.` });

        const { data: org } = await supabase.from("organizations").select("organization_name").eq("account_id", session.account_id).maybeSingle();

        return res.status(200).json({
            success: true,
            session: {
                session_id:   session.session_id,
                amount:       session.amount,
                note:         session.note,
                reference_id: session.reference_id,
                status:       session.status,
                expires_at:   session.expires_at,
                merchant: { account_id: session.account_id, name: org?.organization_name || "Merchant" },
            },
        });
    } catch (err) {
        console.error("[resolveCheckout]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

// POST /api/pos/checkout/:session_id/pay  (JWT authenticated — Kharcha app user)
const payCheckout = async (req, res) => {
    try {
        const { session_id } = req.params;
        const { account_id: payer_account_id } = req.account;

        const { data: session, error: sessionError } = await supabase
            .from("pos_checkout_sessions")
            .select("session_id, account_id, api_key_id, amount, note, reference_id, callback_url, status, expires_at")
            .eq("session_id", session_id)
            .maybeSingle();

        if (sessionError) throw sessionError;
        if (!session) return res.status(404).json({ success: false, message: "Checkout session not found." });
        if (session.status === "paid")    return res.status(409).json({ success: false, message: "Session already paid." });
        if (session.status !== "pending") return res.status(410).json({ success: false, message: `Session is ${session.status}.` });
        if (new Date(session.expires_at) < new Date()) {
            await supabase.from("pos_checkout_sessions").update({ status: "expired" }).eq("session_id", session_id);
            return res.status(410).json({ success: false, message: "Checkout session has expired." });
        }
        if (session.account_id === payer_account_id) {
            return res.status(400).json({ success: false, message: "Cannot pay your own checkout." });
        }

        const { data: result, error: chargeError } = await supabase.rpc("transfer_funds", {
            p_sender_account_id:   payer_account_id,
            p_receiver_account_id: session.account_id,
            p_amount:              session.amount,
            p_remarks:             session.note || `QR Checkout – ${session.reference_id || session.session_id}`,
        });

        if (chargeError) {
            const msg = chargeError.message || "";
            if (msg.includes("INSUFFICIENT_BALANCE")) return res.status(400).json({ success: false, message: "Insufficient wallet balance." });
            if (msg.includes("WALLET_NOT_FOUND"))     return res.status(400).json({ success: false, message: "Wallet not found." });
            throw chargeError;
        }

        await supabase.from("pos_checkout_sessions").update({
            status: "paid",
            transaction_id: result.transaction_id,
            paid_at: new Date().toISOString(),
        }).eq("session_id", session_id);

        dispatchCheckoutWebhook(session, result.transaction_id);

        return res.status(200).json({
            success: true,
            message: "Payment successful.",
            transaction: {
                transaction_id: result.transaction_id,
                amount:         session.amount,
                currency:       "NPR",
                balance_after:  parseFloat(result.sender_balance_after),
                session_id,
                reference_id:   session.reference_id || null,
            },
        });
    } catch (err) {
        console.error("[payCheckout]", err);
        return res.status(500).json({ success: false, message: "Payment failed.", error: err.message });
    }
};

// GET /api/pos/checkout/:session_id/status  (store polling — X-API-Key)
const checkoutStatus = async (req, res) => {
    try {
        const rawKey = req.headers["x-api-key"];
        const { session_id } = req.params;
        const { apiKey, error: keyError } = await resolveApiKey(rawKey);
        if (keyError) return res.status(401).json({ success: false, message: keyError });

        const { data: session, error } = await supabase
            .from("pos_checkout_sessions")
            .select("session_id, account_id, amount, note, reference_id, status, transaction_id, expires_at, paid_at")
            .eq("session_id", session_id)
            .eq("account_id", apiKey.account_id)
            .maybeSingle();

        if (error) throw error;
        if (!session) return res.status(404).json({ success: false, message: "Session not found." });

        return res.status(200).json({
            success: true,
            session: {
                session_id:     session.session_id,
                amount:         session.amount,
                note:           session.note,
                reference_id:   session.reference_id,
                status:         session.status,
                transaction_id: session.transaction_id,
                expires_at:     session.expires_at,
                paid_at:        session.paid_at,
            },
        });
    } catch (err) {
        console.error("[checkoutStatus]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

module.exports = { posCharge, createCheckout, resolveCheckout, payCheckout, checkoutStatus };
