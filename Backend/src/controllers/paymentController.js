/**
 * paymentController.js
 *
 * External payment API — for third-party organizations to verify a Kharcha
 * card (by card number + CVV) and process a charge against the cardholder's
 * wallet.
 *
 * Authentication: X-API-Key header (same org API key system as POS).
 *
 * Endpoints:
 *   POST /api/payment/charge   — verify card + CVV and charge
 *   POST /api/payment/verify   — verify card details only (no charge)
 */

const bcrypt   = require("bcrypt");
const supabase = require("../services/supabaseClient");

// ─────────────────────────────────────────────────────────────
//  Shared: resolve org API key (same logic as posController)
// ─────────────────────────────────────────────────────────────
async function resolveApiKey(rawKey) {
    if (!rawKey || !rawKey.startsWith("kh_live_")) {
        return { error: "Invalid API key format. Expected 'kh_live_...'." };
    }
    const keyPrefix = rawKey.slice(0, 12);
    const { data: candidates, error } = await supabase
        .from("api_keys")
        .select("api_key_id, account_id, key_hash, is_active, expires_at")
        .eq("key_prefix", keyPrefix)
        .eq("is_active", true);

    if (error || !candidates || candidates.length === 0) {
        return { error: "Invalid or revoked API key." };
    }

    let matched = null;
    for (const candidate of candidates) {
        const ok = await bcrypt.compare(rawKey, candidate.key_hash);
        if (ok) { matched = candidate; break; }
    }
    if (!matched) return { error: "Invalid API key." };
    if (matched.expires_at && new Date(matched.expires_at) < new Date()) {
        return { error: "API key has expired." };
    }

    // Update last_used_at in background
    supabase.from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("api_key_id", matched.api_key_id)
        .then(() => {});

    return { apiKey: matched };
}

// ─────────────────────────────────────────────────────────────
//  VERIFY + CHARGE
//  POST /api/payment/charge
//  Header: X-API-Key: kh_live_...
//  Body:   { card_number, cvv, amount, currency?, remarks? }
//
//  Flow:
//    1. Validate org API key
//    2. Look up card by card_number (any card type)
//    3. Verify CVV against bcrypt hash
//    4. Check card is active and not blocked/expired
//    5. Check daily spend limit
//    6. Debit cardholder wallet → credit org wallet via transfer_funds RPC
//    7. Return transaction receipt
//
//  Error codes returned in `error_code` field:
//    INVALID_API_KEY      — missing/bad key
//    CARD_NOT_FOUND       — card_number not in system
//    INVALID_CVV          — CVV does not match stored hash
//    CARD_INACTIVE        — card is blocked/expired/pending
//    DAILY_LIMIT_EXCEEDED — charge would exceed card's daily limit
//    INSUFFICIENT_BALANCE — cardholder wallet has insufficient funds
//    SELF_CHARGE          — org is trying to charge itself
//    VALIDATION_ERROR     — missing/bad request fields
// ─────────────────────────────────────────────────────────────
const chargeCard = async (req, res) => {
    try {
        const rawKey = req.headers["x-api-key"];
        const { card_number, cvv, amount, currency = "NPR", remarks } = req.body;

        // ── 1. Validate API key ──────────────────────────────
        const { apiKey, error: keyError } = await resolveApiKey(rawKey);
        if (keyError) {
            return res.status(401).json({ success: false, error_code: "INVALID_API_KEY", message: keyError });
        }

        // ── 2. Validate request body ─────────────────────────
        if (!card_number || !cvv || !amount) {
            return res.status(400).json({
                success: false,
                error_code: "VALIDATION_ERROR",
                message: "card_number, cvv, and amount are required.",
                required_fields: ["card_number", "cvv", "amount"],
            });
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount < 1) {
            return res.status(400).json({
                success: false,
                error_code: "VALIDATION_ERROR",
                message: "amount must be a positive number (minimum NPR 1).",
            });
        }

        if (currency !== "NPR") {
            return res.status(400).json({
                success: false,
                error_code: "VALIDATION_ERROR",
                message: "Only NPR (Nepalese Rupee) is supported at this time.",
            });
        }

        // ── 3. Look up card by card_number ───────────────────
        const { data: card, error: cardErr } = await supabase
            .from("cards")
            .select("card_id, account_id, card_type, cvv, status, daily_limit, expiry_date")
            .eq("card_number", card_number.replace(/\s+/g, "")) // accept spaced or unspaced
            .maybeSingle();

        if (cardErr) throw cardErr;
        if (!card) {
            return res.status(404).json({
                success: false,
                error_code: "CARD_NOT_FOUND",
                message: "Card not found. Please check the card number.",
            });
        }

        // ── 4. Verify CVV ────────────────────────────────────
        const cvvMatches = await bcrypt.compare(String(cvv).trim(), card.cvv);
        if (!cvvMatches) {
            return res.status(401).json({
                success: false,
                error_code: "INVALID_CVV",
                message: "CVV verification failed. Payment declined.",
            });
        }

        // ── 5. Check card status ─────────────────────────────
        if (card.status !== "active") {
            const statusMessages = {
                blocked: "Card is blocked. Payment declined.",
                expired: "Card has expired. Payment declined.",
                pending: "Card is not yet activated. Payment declined.",
            };
            return res.status(403).json({
                success: false,
                error_code: "CARD_INACTIVE",
                message: statusMessages[card.status] || `Card is ${card.status}. Payment declined.`,
                card_status: card.status,
            });
        }

        // Check expiry date
        if (card.expiry_date && new Date(card.expiry_date) < new Date()) {
            return res.status(403).json({
                success: false,
                error_code: "CARD_INACTIVE",
                message: "Card has expired. Payment declined.",
                card_status: "expired",
            });
        }

        // ── 6. Self-charge guard ──────────────────────────────
        if (card.account_id === apiKey.account_id) {
            return res.status(400).json({
                success: false,
                error_code: "SELF_CHARGE",
                message: "Cannot charge your own Kharcha account.",
            });
        }

        // ── 7. Verify merchant account is active ─────────────
        const { data: merchantAccount } = await supabase
            .from("accounts")
            .select("account_id, account_type, is_active")
            .eq("account_id", apiKey.account_id)
            .maybeSingle();

        if (!merchantAccount || !merchantAccount.is_active) {
            return res.status(403).json({
                success: false,
                error_code: "INVALID_API_KEY",
                message: "Merchant account is inactive or not found.",
            });
        }

        // ── 8. Process payment via Supabase RPC ──────────────
        //    Uses the same transfer_funds stored procedure as wallet transfers.
        //    The RPC handles: balance checks, daily limit enforcement, and
        //    atomic debit/credit in a single DB transaction.
        const { data: result, error: transferErr } = await supabase.rpc("transfer_funds", {
            p_sender_account_id:   card.account_id,
            p_receiver_account_id: apiKey.account_id,
            p_amount:              parsedAmount,
            p_remarks:             remarks?.trim() || `Card payment – ${merchantAccount.account_id}`,
        });

        if (transferErr) {
            const msg = transferErr.message || "";
            if (msg.includes("INSUFFICIENT_BALANCE")) {
                return res.status(400).json({ success: false, error_code: "INSUFFICIENT_BALANCE", message: "Insufficient wallet balance. Payment declined." });
            }
            if (msg.includes("EXCEEDS_DAILY_LIMIT")) {
                return res.status(400).json({ success: false, error_code: "DAILY_LIMIT_EXCEEDED", message: "Card daily spend limit reached. Payment declined." });
            }
            if (msg.includes("WALLET_NOT_FOUND")) {
                return res.status(400).json({ success: false, error_code: "WALLET_NOT_FOUND", message: "Cardholder wallet not found." });
            }
            throw transferErr;
        }

        // ── 9. Fetch merchant display name ───────────────────
        const { data: org } = await supabase
            .from("organizations")
            .select("organization_name")
            .eq("account_id", apiKey.account_id)
            .maybeSingle();

        // ── 10. Stamp the correct method on the transaction ──
        // transfer_funds defaults to "Kharcha Wallet"; override to "Credit Card"
        // so statements show the right label for card-based payments.
        if (result?.transaction_id) {
            await supabase
                .from("transactions")
                .update({ method: "Credit Card" })
                .eq("transaction_id", result.transaction_id);
        }

        return res.status(200).json({
            success: true,
            message: "Payment processed successfully.",
            transaction: {
                transaction_id:  result.transaction_id,
                amount:          parsedAmount,
                currency:        "NPR",
                card_type:       card.card_type,
                card_last4:      card_number.replace(/\s+/g, "").slice(-4),
                merchant: {
                    account_id:   apiKey.account_id,
                    display_name: org?.organization_name || "Merchant",
                },
                remarks:         remarks?.trim() || null,
                method:          "Credit Card",
                status:          "completed",
                processed_at:    new Date().toISOString(),
            },
        });
    } catch (err) {
        console.error("[chargeCard]", err);
        return res.status(500).json({ success: false, error_code: "SERVER_ERROR", message: "Payment processing failed. Please try again." });
    }
};

// ─────────────────────────────────────────────────────────────
//  VERIFY ONLY (no charge)
//  POST /api/payment/verify
//  Header: X-API-Key: kh_live_...
//  Body:   { card_number, cvv }
//
//  Returns whether the card + CVV combination is valid and the card is active.
//  Does NOT debit anything. Useful for pre-authorization checks.
// ─────────────────────────────────────────────────────────────
const verifyCard = async (req, res) => {
    try {
        const rawKey = req.headers["x-api-key"];
        const { card_number, cvv } = req.body;

        const { apiKey, error: keyError } = await resolveApiKey(rawKey);
        if (keyError) {
            return res.status(401).json({ success: false, error_code: "INVALID_API_KEY", message: keyError });
        }

        if (!card_number || !cvv) {
            return res.status(400).json({ success: false, error_code: "VALIDATION_ERROR", message: "card_number and cvv are required." });
        }

        const { data: card } = await supabase
            .from("cards")
            .select("card_id, card_type, cvv, status, expiry_date, daily_limit")
            .eq("card_number", card_number.replace(/\s+/g, ""))
            .maybeSingle();

        if (!card) {
            return res.status(200).json({ success: true, valid: false, error_code: "CARD_NOT_FOUND", message: "Card not found." });
        }

        const cvvMatches = await bcrypt.compare(String(cvv).trim(), card.cvv);
        if (!cvvMatches) {
            return res.status(200).json({ success: true, valid: false, error_code: "INVALID_CVV", message: "CVV does not match." });
        }

        const isExpired = card.expiry_date && new Date(card.expiry_date) < new Date();
        const isActive  = card.status === "active" && !isExpired;

        return res.status(200).json({
            success: true,
            valid:   isActive,
            card: {
                card_type:   card.card_type,
                card_last4:  card_number.replace(/\s+/g, "").slice(-4),
                status:      isExpired ? "expired" : card.status,
                daily_limit: card.daily_limit,
                expiry_date: card.expiry_date,
            },
            ...(isActive ? {} : {
                error_code: isExpired ? "CARD_INACTIVE" : "CARD_INACTIVE",
                message:    isExpired ? "Card has expired." : `Card is ${card.status}.`,
            }),
        });
    } catch (err) {
        console.error("[verifyCard]", err);
        return res.status(500).json({ success: false, error_code: "SERVER_ERROR", message: "Server error." });
    }
};

// ─────────────────────────────────────────────────────────────
//  REFUND
//  POST /api/payment/refund
//  Header: X-API-Key: kh_live_...
//  Body:   { transaction_id, reason? }
//
//  Flow:
//    1. Validate org API key
//    2. Look up the original transaction
//    3. Verify the org was the receiver (can only refund payments made to you)
//    4. Check the transaction hasn't already been refunded
//    5. Reverse the funds: org wallet → original payer wallet
//    6. Record the refund in the `refunds` table
//    7. Stamp method as "Refund" and return receipt
//
//  Error codes:
//    INVALID_API_KEY        — missing/bad key
//    VALIDATION_ERROR       — missing fields
//    TRANSACTION_NOT_FOUND  — transaction_id doesn't exist
//    UNAUTHORIZED           — org was not the receiver of this transaction
//    ALREADY_REFUNDED       — refund already issued for this transaction
//    INSUFFICIENT_BALANCE   — org wallet doesn't have enough to refund
// ─────────────────────────────────────────────────────────────
const refundPayment = async (req, res) => {
    try {
        const rawKey = req.headers["x-api-key"];
        const { transaction_id, reason } = req.body;

        // ── 1. Validate API key ──────────────────────────────
        const { apiKey, error: keyError } = await resolveApiKey(rawKey);
        if (keyError) {
            return res.status(401).json({ success: false, error_code: "INVALID_API_KEY", message: keyError });
        }

        // ── 2. Validate request body ─────────────────────────
        if (!transaction_id) {
            return res.status(400).json({
                success: false,
                error_code: "VALIDATION_ERROR",
                message: "transaction_id is required.",
            });
        }

        // ── 3. Look up the original transaction ───────────────
        const { data: txn, error: txnErr } = await supabase
            .from("transactions")
            .select("transaction_id, sender_account_id, receiver_account_id, amount, status, method")
            .eq("transaction_id", transaction_id)
            .maybeSingle();

        if (txnErr) throw txnErr;
        if (!txn) {
            return res.status(404).json({
                success: false,
                error_code: "TRANSACTION_NOT_FOUND",
                message: "Transaction not found.",
            });
        }

        // ── 4. Verify the org was the receiver ────────────────
        if (txn.receiver_account_id !== apiKey.account_id) {
            return res.status(403).json({
                success: false,
                error_code: "UNAUTHORIZED",
                message: "You can only refund transactions where your organisation was the recipient.",
            });
        }

        // ── 5. Check not already refunded ────────────────────
        const { data: existingRefund } = await supabase
            .from("refunds")
            .select("refund_id")
            .eq("original_transaction_id", transaction_id)
            .maybeSingle();

        if (existingRefund) {
            return res.status(409).json({
                success: false,
                error_code: "ALREADY_REFUNDED",
                message: "This transaction has already been refunded.",
            });
        }

        // ── 6. Fetch org name for the remarks ─────────────────
        const { data: org } = await supabase
            .from("organizations")
            .select("organization_name")
            .eq("account_id", apiKey.account_id)
            .maybeSingle();

        const orgName   = org?.organization_name || "Merchant";
        const refundNote = `Refunded from ${orgName}`;

        // ── 7. Reverse the funds (org → original payer) ───────
        const { data: result, error: transferErr } = await supabase.rpc("transfer_funds", {
            p_sender_account_id:   apiKey.account_id,
            p_receiver_account_id: txn.sender_account_id,
            p_amount:              parseFloat(txn.amount),
            p_remarks:             refundNote,
        });

        if (transferErr) {
            const msg = transferErr.message || "";
            if (msg.includes("INSUFFICIENT_BALANCE")) {
                return res.status(400).json({
                    success: false,
                    error_code: "INSUFFICIENT_BALANCE",
                    message: "Insufficient balance in your organisation wallet to issue this refund.",
                });
            }
            throw transferErr;
        }

        // ── 8. Stamp both transactions with correct method ────
        const refundTxnId = result?.transaction_id;

        await Promise.all([
            // Refund transaction: show as "Refund" in statements
            refundTxnId
                ? supabase.from("transactions")
                    .update({ method: "Refund" })
                    .eq("transaction_id", refundTxnId)
                : Promise.resolve(),

            // Record in refunds table for idempotency guard
            supabase.from("refunds").insert({
                original_transaction_id: transaction_id,
                refund_transaction_id:   refundTxnId || null,
                refunded_by_account_id:  apiKey.account_id,
                amount:                  parseFloat(txn.amount),
                reason:                  reason?.trim() || null,
            }),
        ]);

        return res.status(200).json({
            success: true,
            message: "Refund processed successfully.",
            refund: {
                refund_transaction_id:    refundTxnId,
                original_transaction_id:  transaction_id,
                amount:                   parseFloat(txn.amount),
                currency:                 "NPR",
                remarks:                  refundNote,
                method:                   "Refund",
                status:                   "completed",
                processed_at:             new Date().toISOString(),
            },
        });
    } catch (err) {
        console.error("[refundPayment]", err);
        return res.status(500).json({ success: false, error_code: "SERVER_ERROR", message: "Refund processing failed. Please try again." });
    }
};

module.exports = { chargeCard, verifyCard, refundPayment };