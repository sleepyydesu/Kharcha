const bcrypt = require("bcrypt");
const supabase = require("../services/supabaseClient");

// ─────────────────────────────────────────────────────────────
//  HELPER: Resolve and validate API key from header
//  Returns the full api_key row or an error string
// ─────────────────────────────────────────────────────────────
async function resolveApiKey(rawKey) {
    if (!rawKey || !rawKey.startsWith("kh_live_")) {
        return { error: "Invalid API key format." };
    }

    const keyPrefix = rawKey.slice(0, 12); // first 12 chars

    // Fetch all active keys with this prefix (usually just 1)
    const { data: candidates, error } = await supabase
        .from("api_keys")
        .select("api_key_id, account_id, key_hash, is_active, expires_at")
        .eq("key_prefix", keyPrefix)
        .eq("is_active", true);

    if (error || !candidates || candidates.length === 0) {
        return { error: "Invalid or revoked API key." };
    }

    // Find the one whose hash matches
    let matched = null;
    for (const candidate of candidates) {
        const ok = await bcrypt.compare(rawKey, candidate.key_hash);
        if (ok) {
            matched = candidate;
            break;
        }
    }

    if (!matched) {
        return { error: "Invalid API key." };
    }

    // Check expiry
    if (matched.expires_at && new Date(matched.expires_at) < new Date()) {
        return { error: "API key has expired." };
    }

    return { apiKey: matched };
}

// ─────────────────────────────────────────────────────────────
//  POS CHARGE
//  POST /api/pos/charge
//
//  Authenticated via X-API-Key header (no JWT).
//  All terminals belonging to an org use the same API key —
//  there is no pos_terminals table.
//
//  Headers:
//    X-API-Key: kh_live_<...>
//
//  Body:
//    card_id   string   — RFID UID read by the RC522 (e.g. "A3B2C1D0")
//    amount    number   — amount in NPR
//    remarks?  string   — e.g. "Purchase at Bhatbhateni", receipt number
// ─────────────────────────────────────────────────────────────
const posCharge = async (req, res) => {
    try {
        const rawKey = req.headers["x-api-key"];
        const { card_id, amount, remarks } = req.body;

        // ── Validate API key ───────────────────────────────────────
        const { apiKey, error: keyError } = await resolveApiKey(rawKey);
        if (keyError) {
            return res.status(401).json({ success: false, message: keyError });
        }

        // ── Validate request body ──────────────────────────────────
        if (!card_id) {
            return res
                .status(400)
                .json({ success: false, message: "card_id is required." });
        }

        const parsedAmount = parseFloat(amount);
        if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "amount must be a positive number.",
            });
        }

        if (parsedAmount < 1) {
            return res.status(400).json({
                success: false,
                message: "Minimum charge amount is NPR 1.",
            });
        }

        // ── Fetch card ─────────────────────────────────────────────
        const { data: card, error: cardError } = await supabase
            .from("physical_cards")
            .select("card_id, account_id, status, daily_limit")
            .eq("card_id", card_id.toUpperCase())
            .maybeSingle();

        if (cardError) throw cardError;
        if (!card) {
            return res.status(404).json({
                success: false,
                message: "Card not found. It may not be registered.",
            });
        }
        if (card.status !== "active") {
            const statusMessages = {
                pending: "This card has not been activated yet.",
                blocked:
                    "This card has been blocked. The cardholder should contact support.",
                expired: "This card has expired.",
            };
            return res.status(403).json({
                success: false,
                message: statusMessages[card.status] || "Card is not active.",
            });
        }

        // ── Get receiver (the org linked to the API key) ───────────
        const { data: receiverAccount, error: receiverError } = await supabase
            .from("accounts")
            .select("account_id, account_type, is_active")
            .eq("account_id", apiKey.account_id)
            .maybeSingle();

        if (receiverError) throw receiverError;
        if (!receiverAccount || !receiverAccount.is_active) {
            return res.status(400).json({
                success: false,
                message: "Merchant account is inactive.",
            });
        }

        // Prevent charging own wallet (user is also the merchant)
        if (card.account_id === receiverAccount.account_id) {
            return res.status(400).json({
                success: false,
                message: "Cannot charge your own account.",
            });
        }

        // ── Execute atomic POS transfer via RPC ────────────────────
        const { data: result, error: chargeError } = await supabase.rpc(
            "pos_charge_funds",
            {
                p_card_id: card_id.toUpperCase(),
                p_receiver_account_id: receiverAccount.account_id,
                p_amount: parsedAmount,
                p_remarks: remarks || null,
            },
        );

        if (chargeError) {
            const msg = chargeError.message || "";
            if (msg.includes("CARD_INACTIVE"))
                return res
                    .status(403)
                    .json({ success: false, message: "Card is not active." });
            if (msg.includes("INSUFFICIENT_BALANCE"))
                return res.status(400).json({
                    success: false,
                    message: "Insufficient wallet balance.",
                });
            if (msg.includes("EXCEEDS_DAILY_LIMIT"))
                return res.status(400).json({
                    success: false,
                    message: "Card daily spending limit reached.",
                });
            if (msg.includes("WALLET_NOT_FOUND"))
                return res.status(400).json({
                    success: false,
                    message: "Cardholder wallet not found.",
                });
            if (msg.includes("RECEIVER_WALLET_NOT_FOUND"))
                return res.status(400).json({
                    success: false,
                    message: "Merchant wallet not found.",
                });
            throw chargeError;
        }

        // ── Update API key last_used_at (non-blocking) ─────────────
        supabase
            .from("api_keys")
            .update({ last_used_at: new Date().toISOString() })
            .eq("api_key_id", apiKey.api_key_id)
            .then(() => {});

        // ── Fetch merchant display name for response ───────────────
        const { data: merchantProfile } = await supabase
            .from("organizations")
            .select("organization_name")
            .eq("account_id", receiverAccount.account_id)
            .maybeSingle();

        return res.status(200).json({
            success: true,
            message: "Payment successful.",
            transaction: {
                transaction_id: result.transaction_id,
                amount: parsedAmount,
                currency: "NPR",
                balance_after: parseFloat(result.sender_balance_after),
                merchant: {
                    account_id: receiverAccount.account_id,
                    display_name:
                        merchantProfile?.organization_name || "Merchant",
                },
                remarks: remarks || null,
                method: "Kharcha Card",
                status: "completed",
            },
        });
    } catch (err) {
        console.error("[posCharge]", err);
        return res.status(500).json({
            success: false,
            message: "Charge failed.",
            error: err.message,
        });
    }
};

module.exports = { posCharge };
