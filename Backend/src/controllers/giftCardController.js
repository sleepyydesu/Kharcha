const supabase = require("../services/supabaseClient");
const crypto = require("crypto");

// ─────────────────────────────────────────────────────────────
//  SYSTEM ACCOUNT — used as the "sender" for gift card redemptions
//  This is the platform's treasury account that funds gift cards.
// ─────────────────────────────────────────────────────────────
const SYSTEM_ACCOUNT_ID = "00000000-0000-0000-0000-000000000000";

// ─────────────────────────────────────────────────────────────
//  GENERATE GIFT CARDS  (admin only)
//  POST /api/gift-cards/generate
//
//  Body:
//    {
//      "500": 3,      // generate 3 cards worth NPR 500 each
//      "1000": 2,     // generate 2 cards worth NPR 1000 each
//      max_uses?: number   // how many times each card can be used (default: 1)
//    }
//
//  Returns all generated codes grouped by amount.
// ─────────────────────────────────────────────────────────────
const generateGiftCards = async (req, res) => {
    try {
        const { account_id, account_type } = req.account;

        if (account_type !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can generate gift cards.",
            });
        }

        // Pull out max_uses if provided, then treat the rest as amount→count pairs
        const { max_uses: rawMaxUses, ...amountMap } = req.body;
        const max_uses = parseInt(rawMaxUses) || 1;

        if (max_uses < 1) {
            return res.status(400).json({
                success: false,
                message: "max_uses must be at least 1.",
            });
        }

        if (!amountMap || Object.keys(amountMap).length === 0) {
            return res.status(400).json({
                success: false,
                message:
                    'Request body must include at least one amount→count pair. Example: { "500": 3, "1000": 2 }',
            });
        }

        // Validate all entries before inserting anything
        const entries = [];
        for (const [amountStr, countRaw] of Object.entries(amountMap)) {
            const amount = parseFloat(amountStr);
            const count = parseInt(countRaw);

            if (isNaN(amount) || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid amount key "${amountStr}". Must be a positive number.`,
                });
            }

            if (isNaN(count) || count < 1) {
                return res.status(400).json({
                    success: false,
                    message: `Count for amount ${amount} must be a positive integer.`,
                });
            }

            if (count > 500) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot generate more than 500 cards per amount in a single request (requested ${count} for NPR ${amount}).`,
                });
            }

            entries.push({ amount, count });
        }

        // Generate all card rows
        const rows = [];
        for (const { amount, count } of entries) {
            for (let i = 0; i < count; i++) {
                // Format: KHRCH-XXXX-XXXX-XXXX  (16 hex chars, uppercase)
                const raw = crypto.randomBytes(6).toString("hex").toUpperCase();
                const code = `KHRCH-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
                rows.push({
                    code,
                    amount,
                    max_uses,
                    times_used: 0,
                    is_active: true,
                    created_by: account_id,
                });
            }
        }

        const { data: inserted, error } = await supabase
            .from("gift_cards")
            .insert(rows)
            .select("gift_card_id, code, amount, max_uses, created_at");

        if (error) throw error;

        // Group response by amount for readability
        const grouped = {};
        for (const card of inserted) {
            const key = card.amount.toString();
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push({
                gift_card_id: card.gift_card_id,
                code: card.code,
                created_at: card.created_at,
            });
        }

        return res.status(201).json({
            success: true,
            message: `Successfully generated ${inserted.length} gift card(s).`,
            max_uses,
            cards: grouped,
            total_generated: inserted.length,
        });
    } catch (err) {
        console.error("[generateGiftCards]", err);
        return res.status(500).json({
            success: false,
            message: "Server error.",
            error: err.message,
        });
    }
};

// ─────────────────────────────────────────────────────────────
//  REDEEM GIFT CARD  (authenticated user)
//  POST /api/gift-cards/redeem
//
//  Body: { code: "KHRCH-XXXX-XXXX-XXXX" }
//
//  • Validates the code exists and is active
//  • Checks the user hasn't already redeemed this card
//  • Checks the card hasn't hit its max_uses limit
//  • Transfers the card's amount from the system account to the user
//  • Records the usage in gift_card_usages
// ─────────────────────────────────────────────────────────────
const redeemGiftCard = async (req, res) => {
    try {
        const { account_id } = req.account;
        const { code } = req.body;

        if (!code || typeof code !== "string") {
            return res.status(400).json({
                success: false,
                message: "code is required.",
            });
        }

        const normalizedCode = code.trim().toUpperCase();

        // ── Fetch the gift card ───────────────────────────────
        const { data: card, error: cardError } = await supabase
            .from("gift_cards")
            .select("gift_card_id, amount, max_uses, times_used, is_active")
            .eq("code", normalizedCode)
            .maybeSingle();

        if (cardError) throw cardError;

        if (!card) {
            return res.status(404).json({
                success: false,
                message: "Invalid gift card code.",
            });
        }

        if (!card.is_active) {
            return res.status(400).json({
                success: false,
                message: "This gift card has been deactivated.",
            });
        }

        if (card.times_used >= card.max_uses) {
            return res.status(400).json({
                success: false,
                message: "This gift card has already been fully redeemed.",
            });
        }

        // ── Check if this user already used this card ─────────
        const { data: priorUsage, error: usageCheckError } = await supabase
            .from("gift_card_usages")
            .select("usage_id")
            .eq("gift_card_id", card.gift_card_id)
            .eq("redeemed_by", account_id)
            .maybeSingle();

        if (usageCheckError) throw usageCheckError;

        if (priorUsage) {
            return res.status(409).json({
                success: false,
                message: "You have already redeemed this gift card.",
            });
        }

        // ── Execute the transfer from system account ──────────
        const { data: result, error: transferError } = await supabase.rpc(
            "transfer_funds",
            {
                p_sender_account_id: SYSTEM_ACCOUNT_ID,
                p_receiver_account_id: account_id,
                p_amount: card.amount,
                p_category_id: null,
                p_remarks: `Gift card redemption: ${normalizedCode}`,
            }
        );

        if (transferError) {
            const msg = transferError.message || "";
            if (msg.includes("INSUFFICIENT_BALANCE")) {
                return res.status(400).json({
                    success: false,
                    message:
                        "System account has insufficient balance to fulfil this gift card. Please contact support.",
                });
            }
            if (msg.includes("WALLET_NOT_FOUND")) {
                return res.status(500).json({
                    success: false,
                    message: "System wallet not configured. Please contact support.",
                });
            }
            throw transferError;
        }

        // ── Resolve new balance ────────────────────────────────────
        let newBalance = null;
        if (result && result.receiver_balance_after != null) {
            newBalance = parseFloat(result.receiver_balance_after);
        } else {
            const { data: walletRow } = await supabase
                .from("wallets")
                .select("balance")
                .eq("account_id", account_id)
                .single();
            if (walletRow) newBalance = parseFloat(walletRow.balance);
        }

        // ── Record usage & increment counter ──────────────────
        const { error: usageInsertError } = await supabase
            .from("gift_card_usages")
            .insert({
                gift_card_id: card.gift_card_id,
                redeemed_by: account_id,
                amount_credited: card.amount,
                transaction_id: result.transaction_id,
            });

        if (usageInsertError) throw usageInsertError;

        const newTimesUsed = card.times_used + 1;
        const shouldDeactivate = newTimesUsed >= card.max_uses;

        const { error: updateError } = await supabase
            .from("gift_cards")
            .update({
                times_used: newTimesUsed,
                is_active: !shouldDeactivate,
                updated_at: new Date().toISOString(),
            })
            .eq("gift_card_id", card.gift_card_id);

        if (updateError) throw updateError;

        return res.status(200).json({
            success: true,
            message: `Gift card redeemed! NPR ${card.amount} has been added to your wallet.`,
            redemption: {
                amount_credited: card.amount,
                currency: "NPR",
                new_balance: newBalance,
                transaction_id: result.transaction_id,
                uses_remaining: card.max_uses - newTimesUsed,
            },
        });
    } catch (err) {
        console.error("[redeemGiftCard]", err);
        return res.status(500).json({
            success: false,
            message: "Server error.",
            error: err.message,
        });
    }
};

// ─────────────────────────────────────────────────────────────
//  LIST GIFT CARDS  (admin only)
//  GET /api/gift-cards
//  Query: is_active=true|false, page, limit
// ─────────────────────────────────────────────────────────────
const listGiftCards = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;

        let query = supabase
            .from("gift_cards")
            .select(
                "gift_card_id, code, amount, max_uses, times_used, is_active, created_at, updated_at",
                { count: "exact" }
            )
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (req.query.is_active !== undefined) {
            query = query.eq("is_active", req.query.is_active === "true");
        }

        const { data, error, count } = await query;
        if (error) throw error;

        return res.status(200).json({
            success: true,
            data,
            pagination: {
                page,
                limit,
                total: count || 0,
                total_pages: Math.ceil((count || 0) / limit),
            },
        });
    } catch (err) {
        console.error("[listGiftCards]", err);
        return res.status(500).json({
            success: false,
            message: "Server error.",
            error: err.message,
        });
    }
};

// ─────────────────────────────────────────────────────────────
//  DEACTIVATE GIFT CARD  (admin only)
//  PATCH /api/gift-cards/:gift_card_id/deactivate
// ─────────────────────────────────────────────────────────────
const deactivateGiftCard = async (req, res) => {
    try {
        const { gift_card_id } = req.params;

        const { data: card, error: fetchError } = await supabase
            .from("gift_cards")
            .select("gift_card_id, is_active")
            .eq("gift_card_id", gift_card_id)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!card) {
            return res.status(404).json({ success: false, message: "Gift card not found." });
        }

        if (!card.is_active) {
            return res.status(409).json({
                success: false,
                message: "Gift card is already inactive.",
            });
        }

        const { error: updateError } = await supabase
            .from("gift_cards")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("gift_card_id", gift_card_id);

        if (updateError) throw updateError;

        return res.status(200).json({
            success: true,
            message: "Gift card deactivated successfully.",
        });
    } catch (err) {
        console.error("[deactivateGiftCard]", err);
        return res.status(500).json({
            success: false,
            message: "Server error.",
            error: err.message,
        });
    }
};

module.exports = {
    generateGiftCards,
    redeemGiftCard,
    listGiftCards,
    deactivateGiftCard,
};
