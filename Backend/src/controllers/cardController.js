const supabase = require("../services/supabaseClient");

// ─────────────────────────────────────────────────────────────
//  REQUEST A CARD
//  POST /api/cards/request
//  A user submits a card request. Admin will approve, program
//  the RC522 card's UID, and activate it.
// ─────────────────────────────────────────────────────────────
const requestCard = async (req, res) => {
    try {
        const { account_id, account_type } = req.account;
        const { delivery_address } = req.body;

        if (account_type !== "user") {
            return res
                .status(403)
                .json({
                    success: false,
                    message:
                        "Only individual user accounts can request a card.",
                });
        }

        // Check for existing pending/issued card
        const { data: existing } = await supabase
            .from("card_requests")
            .select("request_id, status")
            .eq("account_id", account_id)
            .in("status", ["pending", "approved", "issued"])
            .maybeSingle();

        if (existing) {
            return res.status(409).json({
                success: false,
                message: `You already have a card request with status: ${existing.status}.`,
                request_id: existing.request_id,
            });
        }

        // Also check if they already have an active card
        const { data: activeCard } = await supabase
            .from("physical_cards")
            .select("card_id, status")
            .eq("account_id", account_id)
            .eq("status", "active")
            .maybeSingle();

        if (activeCard) {
            return res.status(409).json({
                success: false,
                message: "You already have an active card.",
            });
        }

        const { data: request, error } = await supabase
            .from("card_requests")
            .insert({
                account_id,
                delivery_address: delivery_address || null,
                status: "pending",
            })
            .select("request_id, status, delivery_address, created_at")
            .single();

        if (error) throw error;

        return res.status(201).json({
            success: true,
            message:
                "Card request submitted. You will be notified when it is ready.",
            request,
        });
    } catch (err) {
        console.error("[requestCard]", err);
        return res
            .status(500)
            .json({
                success: false,
                message: "Server error.",
                error: err.message,
            });
    }
};

// ─────────────────────────────────────────────────────────────
//  GET MY CARD STATUS
//  GET /api/cards/my-card
// ─────────────────────────────────────────────────────────────
const getMyCard = async (req, res) => {
    try {
        const { account_id } = req.account;

        // Check for an active (or any) card first
        const { data: card } = await supabase
            .from("physical_cards")
            .select("card_id, status, daily_limit, activated_at, created_at")
            .eq("account_id", account_id)
            .maybeSingle();

        if (card) {
            return res.status(200).json({ success: true, card });
        }

        // Check for a pending request
        const { data: request } = await supabase
            .from("card_requests")
            .select("request_id, status, created_at")
            .eq("account_id", account_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        return res.status(200).json({
            success: true,
            card: null,
            pending_request: request || null,
        });
    } catch (err) {
        console.error("[getMyCard]", err);
        return res
            .status(500)
            .json({
                success: false,
                message: "Server error.",
                error: err.message,
            });
    }
};

// ─────────────────────────────────────────────────────────────
//  BLOCK MY CARD  (user self-service)
//  POST /api/cards/my-card/block
//  Body: { reason? }
// ─────────────────────────────────────────────────────────────
const blockMyCard = async (req, res) => {
    try {
        const { account_id } = req.account;
        const { reason } = req.body;

        const { data: card, error: fetchError } = await supabase
            .from("physical_cards")
            .select("card_id, status")
            .eq("account_id", account_id)
            .eq("status", "active")
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!card) {
            return res
                .status(404)
                .json({ success: false, message: "No active card found." });
        }

        const { error } = await supabase
            .from("physical_cards")
            .update({
                status: "blocked",
                blocked_at: new Date().toISOString(),
                block_reason: reason || "Blocked by cardholder",
            })
            .eq("card_id", card.card_id);

        if (error) throw error;

        return res.status(200).json({
            success: true,
            message: "Card blocked. Contact support to unblock it.",
        });
    } catch (err) {
        console.error("[blockMyCard]", err);
        return res
            .status(500)
            .json({
                success: false,
                message: "Server error.",
                error: err.message,
            });
    }
};

// ─────────────────────────────────────────────────────────────
//  UPDATE DAILY LIMIT  (user)
//  PATCH /api/cards/my-card/limits
//  Body: { daily_limit }
// ─────────────────────────────────────────────────────────────
const updateCardLimits = async (req, res) => {
    try {
        const { account_id } = req.account;
        const { daily_limit } = req.body;

        if (daily_limit === undefined) {
            return res
                .status(400)
                .json({ success: false, message: "daily_limit is required." });
        }

        const v = parseFloat(daily_limit);
        if (isNaN(v) || v < 100 || v > 100000) {
            return res.status(400).json({
                success: false,
                message: "daily_limit must be between NPR 100 and 100,000.",
            });
        }

        const { data: card } = await supabase
            .from("physical_cards")
            .select("card_id")
            .eq("account_id", account_id)
            .eq("status", "active")
            .maybeSingle();

        if (!card) {
            return res
                .status(404)
                .json({ success: false, message: "No active card found." });
        }

        const { error } = await supabase
            .from("physical_cards")
            .update({ daily_limit: v })
            .eq("card_id", card.card_id);

        if (error) throw error;

        return res.status(200).json({
            success: true,
            message: "Daily limit updated.",
            updates: { daily_limit: v },
        });
    } catch (err) {
        console.error("[updateCardLimits]", err);
        return res
            .status(500)
            .json({
                success: false,
                message: "Server error.",
                error: err.message,
            });
    }
};

// ─────────────────────────────────────────────────────────────
//  ADMIN: Activate a card
//  POST /api/cards/admin/activate
//  Body: { card_id, account_id, request_id? }
//  Admin physically reads the RFID UID from the card, then calls
//  this endpoint to link it to the user's account.
// ─────────────────────────────────────────────────────────────
const adminActivateCard = async (req, res) => {
    try {
        const { account_type } = req.account;

        if (account_type !== "admin") {
            return res
                .status(403)
                .json({ success: false, message: "Admin access required." });
        }

        const { card_id, account_id, request_id } = req.body;

        if (!card_id || !account_id) {
            return res
                .status(400)
                .json({
                    success: false,
                    message: "card_id and account_id are required.",
                });
        }

        const normalizedCardId = card_id.toUpperCase();

        // Check if card_id already exists
        const { data: existing } = await supabase
            .from("physical_cards")
            .select("card_id, status")
            .eq("card_id", normalizedCardId)
            .maybeSingle();

        if (existing) {
            return res.status(409).json({
                success: false,
                message: `Card ID ${normalizedCardId} is already registered with status: ${existing.status}.`,
            });
        }

        // Verify the target account exists
        const { data: targetAccount } = await supabase
            .from("accounts")
            .select("account_id, account_type, is_active")
            .eq("account_id", account_id)
            .maybeSingle();

        if (!targetAccount) {
            return res
                .status(404)
                .json({ success: false, message: "Account not found." });
        }
        if (!targetAccount.is_active) {
            return res
                .status(400)
                .json({ success: false, message: "Account is inactive." });
        }

        // Insert the card as active
        const { data: card, error } = await supabase
            .from("physical_cards")
            .insert({
                card_id: normalizedCardId,
                account_id,
                request_id: request_id || null,
                status: "active",
                activated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw error;

        // Mark the request as issued
        if (request_id) {
            await supabase
                .from("card_requests")
                .update({
                    status: "issued",
                    updated_at: new Date().toISOString(),
                })
                .eq("request_id", request_id);
        }

        return res.status(201).json({
            success: true,
            message: `Card ${normalizedCardId} activated for account ${account_id}.`,
            card: {
                card_id: card.card_id,
                status: card.status,
                activated_at: card.activated_at,
            },
        });
    } catch (err) {
        console.error("[adminActivateCard]", err);
        return res
            .status(500)
            .json({
                success: false,
                message: "Server error.",
                error: err.message,
            });
    }
};

// ─────────────────────────────────────────────────────────────
//  ADMIN: List all card requests
//  GET /api/cards/admin/requests
// ─────────────────────────────────────────────────────────────
const adminListRequests = async (req, res) => {
    try {
        const { account_type } = req.account;
        if (account_type !== "admin") {
            return res
                .status(403)
                .json({ success: false, message: "Admin access required." });
        }

        const status = req.query.status || null;
        let query = supabase
            .from("card_requests")
            .select(
                "request_id, account_id, status, delivery_address, admin_notes, created_at, updated_at",
            )
            .order("created_at", { ascending: false });

        if (status) {
            query = query.eq("status", status);
        }

        const { data: requests, error } = await query;
        if (error) throw error;

        return res
            .status(200)
            .json({ success: true, requests: requests || [] });
    } catch (err) {
        console.error("[adminListRequests]", err);
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
    requestCard,
    getMyCard,
    blockMyCard,
    updateCardLimits,
    adminActivateCard,
    adminListRequests,
};
