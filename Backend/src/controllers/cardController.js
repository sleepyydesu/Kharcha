const bcrypt   = require("bcrypt");
const supabase = require("../services/supabaseClient");
const { sendCardIssuedEmail } = require("../utils/emailUtils");

// ─────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────

function generateCardNumber(BIN = "33333", accountIndex = 0) {
    const base = "7" + BIN + String(accountIndex).padStart(9, "0");
    let sum = 0;
    const reversed = base.split("").reverse();
    for (let i = 0; i < reversed.length; i++) {
        let digit = parseInt(reversed[i], 10);
        if (i % 2 === 0) { digit *= 2; if (digit > 9) digit -= 9; }
        sum += digit;
    }
    const check = (10 - (sum % 10)) % 10;
    return base + check;
}

function generateCVV() {
    return String(Math.floor(100 + Math.random() * 900));
}

async function hashCVV(plainCVV) {
    return bcrypt.hash(plainCVV, 10);
}

/** Exported so paymentController can verify CVV on card payments */
async function verifyCVV(plainCVV, hashedCVV) {
    return bcrypt.compare(plainCVV, hashedCVV);
}

function generateExpiry() {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 4);
    d.setDate(1);
    return d.toISOString().split("T")[0];
}

async function newUniqueCardNumber() {
    const BIN = process.env.CARD_BIN || "33333";
    const { count } = await supabase.from("cards").select("*", { count: "exact", head: true });
    let index = (count ?? 0) + 1;
    for (let attempt = 0; attempt < 50; attempt++) {
        const num = generateCardNumber(BIN, index + attempt);
        const { data: clash } = await supabase.from("cards").select("card_number").eq("card_number", num).maybeSingle();
        if (!clash) return num;
    }
    throw new Error("Could not allocate a unique card number. Try again.");
}

async function getAccountEmail(account_id) {
    const { data } = await supabase.from("accounts").select("email").eq("account_id", account_id).maybeSingle();
    return data?.email || null;
}

// ─────────────────────────────────────────────────────────────
//  GET MY CARDS  — CVV intentionally excluded (delivered by email only)
//  GET /api/cards/my-cards
// ─────────────────────────────────────────────────────────────
const getMyCards = async (req, res) => {
    try {
        const { account_id } = req.account;

        const { data: cards, error } = await supabase
            .from("cards")
            .select("card_id, card_type, card_number, expiry_date, rfid_uid, status, daily_limit, activated_at, blocked_at, block_reason, created_at")
            .eq("account_id", account_id)
            .order("created_at", { ascending: true });

        if (error) throw error;

        const virtual  = cards?.find((c) => c.card_type === "virtual")  || null;
        const physical = cards?.find((c) => c.card_type === "physical") || null;

        let physicalRequest = null;
        if (!physical) {
            const { data: req_ } = await supabase
                .from("card_requests")
                .select("request_id, status, delivery_address, created_at")
                .eq("account_id", account_id)
                .in("status", ["pending", "approved", "issued"])
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            physicalRequest = req_ || null;
        }

        return res.status(200).json({ success: true, virtual, physical, physical_request: physicalRequest });
    } catch (err) {
        console.error("[getMyCards]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  ISSUE VIRTUAL CARD
//  POST /api/cards/virtual/issue
//  CVV is hashed for storage; plain-text CVV is emailed to the user.
// ─────────────────────────────────────────────────────────────
const issueVirtualCard = async (req, res) => {
    try {
        const { account_id, account_type } = req.account;

        if (account_type !== "user") {
            return res.status(403).json({ success: false, message: "Only individual user accounts can issue a virtual card." });
        }

        const { data: existing } = await supabase
            .from("cards").select("card_id, status")
            .eq("account_id", account_id).eq("card_type", "virtual").maybeSingle();

        if (existing) {
            return res.status(409).json({ success: false, message: `You already have a virtual card (status: ${existing.status}).`, card_id: existing.card_id });
        }

        const card_number = await newUniqueCardNumber();
        const plainCVV    = generateCVV();
        const cvv_hash    = await hashCVV(plainCVV);
        const expiry_date = generateExpiry();

        const { data: card, error } = await supabase
            .from("cards")
            .insert({ account_id, card_type: "virtual", card_number, cvv: cvv_hash, expiry_date, status: "active", activated_at: new Date().toISOString() })
            .select("card_id, card_type, card_number, expiry_date, status, daily_limit, activated_at")
            .single();

        if (error) throw error;

        // Send CVV to email — only time it is ever revealed
        const email = await getAccountEmail(account_id);
        if (email) {
            sendCardIssuedEmail(email, plainCVV, "virtual", card_number).catch((e) =>
                console.error("[issueVirtualCard] CVV email failed:", e.message)
            );
        }

        return res.status(201).json({
            success: true,
            message: "Virtual card issued successfully. Your CVV has been sent to your registered email address.",
            card, // CVV is NOT included
        });
    } catch (err) {
        console.error("[issueVirtualCard]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  REQUEST PHYSICAL CARD
//  POST /api/cards/physical/request
// ─────────────────────────────────────────────────────────────
const requestPhysicalCard = async (req, res) => {
    try {
        const { account_id, account_type } = req.account;
        const { delivery_address, pin } = req.body;

        if (account_type !== "user") {
            return res.status(403).json({ success: false, message: "Only individual user accounts can request a physical card." });
        }
        if (!/^\d{6}$/.test(String(pin || ""))) {
            return res.status(400).json({ success: false, message: "Card PIN must be exactly 6 digits." });
        }

        const { data: existingCard } = await supabase
            .from("cards").select("card_id, status")
            .eq("account_id", account_id).eq("card_type", "physical").maybeSingle();
        if (existingCard) {
            return res.status(409).json({ success: false, message: `You already have a physical card (status: ${existingCard.status}).`, card_id: existingCard.card_id });
        }

        const { data: existingReq } = await supabase
            .from("card_requests").select("request_id, status")
            .eq("account_id", account_id).in("status", ["pending", "approved", "issued"]).maybeSingle();
        if (existingReq) {
            return res.status(409).json({ success: false, message: `You already have a card request with status: ${existingReq.status}.`, request_id: existingReq.request_id });
        }

        const cardPinHash = await bcrypt.hash(String(pin), 10);

        const { data: request, error } = await supabase
            .from("card_requests")
            .insert({
                account_id,
                delivery_address: delivery_address || null,
                card_pin_hash: cardPinHash,
                status: "pending",
            })
            .select("request_id, status, delivery_address, created_at")
            .single();

        if (error) throw error;

        return res.status(201).json({
            success: true,
            message: "Physical card request submitted. Your dedicated 6-digit card PIN was saved securely.",
            request,
        });
    } catch (err) {
        console.error("[requestPhysicalCard]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  BLOCK A CARD  (user self-service)
//  POST /api/cards/:card_type/block
// ─────────────────────────────────────────────────────────────
const blockCard = async (req, res) => {
    try {
        const { account_id } = req.account;
        const { card_type }  = req.params;
        const { reason }     = req.body;

        if (!["virtual", "physical"].includes(card_type)) {
            return res.status(400).json({ success: false, message: "card_type must be 'virtual' or 'physical'." });
        }

        const { data: card, error: fetchErr } = await supabase
            .from("cards").select("card_id, status")
            .eq("account_id", account_id).eq("card_type", card_type).eq("status", "active").maybeSingle();

        if (fetchErr) throw fetchErr;
        if (!card) return res.status(404).json({ success: false, message: `No active ${card_type} card found.` });

        const { error } = await supabase.from("cards")
            .update({ status: "blocked", blocked_at: new Date().toISOString(), block_reason: reason || "Blocked by cardholder" })
            .eq("card_id", card.card_id);

        if (error) throw error;

        return res.status(200).json({ success: true, message: `${card_type === "virtual" ? "Virtual" : "Physical"} card blocked. Contact support to unblock.` });
    } catch (err) {
        console.error("[blockCard]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  UPDATE DAILY LIMIT  (user — own cards only)
//  PATCH /api/cards/:card_type/limits
// ─────────────────────────────────────────────────────────────
const updateCardLimits = async (req, res) => {
    try {
        const { account_id } = req.account;
        const { card_type }  = req.params;
        const { daily_limit } = req.body;

        if (!["virtual", "physical"].includes(card_type)) {
            return res.status(400).json({ success: false, message: "card_type must be 'virtual' or 'physical'." });
        }
        if (daily_limit === undefined) return res.status(400).json({ success: false, message: "daily_limit is required." });

        const v = parseFloat(daily_limit);
        if (isNaN(v) || v < 100 || v > 100000) {
            return res.status(400).json({ success: false, message: "daily_limit must be between NPR 100 and 100,000." });
        }

        const { data: card } = await supabase.from("cards").select("card_id")
            .eq("account_id", account_id).eq("card_type", card_type).eq("status", "active").maybeSingle();

        if (!card) return res.status(404).json({ success: false, message: `No active ${card_type} card found.` });

        const { error } = await supabase.from("cards").update({ daily_limit: v }).eq("card_id", card.card_id);
        if (error) throw error;

        return res.status(200).json({ success: true, message: "Daily limit updated.", updates: { daily_limit: v } });
    } catch (err) {
        console.error("[updateCardLimits]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  ADMIN: Activate physical card (sets RFID + generates card number + sends CVV email)
//  POST /api/cards/admin/activate-physical
//  Body: { account_id, rfid_uid, request_id? }
// ─────────────────────────────────────────────────────────────
const adminActivatePhysical = async (req, res) => {
    try {
        const { account_type } = req.account;
        if (account_type !== "admin") return res.status(403).json({ success: false, message: "Admin access required." });

        const { account_id, rfid_uid, request_id } = req.body;
        if (!account_id || !rfid_uid) {
            return res.status(400).json({ success: false, message: "account_id and rfid_uid are required." });
        }

        const normalizedUID = rfid_uid.toUpperCase();

        const { data: uidClash } = await supabase.from("cards").select("card_id").eq("rfid_uid", normalizedUID).maybeSingle();
        if (uidClash) return res.status(409).json({ success: false, message: `RFID UID ${normalizedUID} is already registered.` });

        const { data: existing } = await supabase.from("cards").select("card_id, status")
            .eq("account_id", account_id).eq("card_type", "physical").maybeSingle();
        if (existing) return res.status(409).json({ success: false, message: `Account already has a physical card (status: ${existing.status}).` });

        const { data: targetAccount } = await supabase.from("accounts")
            .select("account_id, email, is_active").eq("account_id", account_id).maybeSingle();
        if (!targetAccount)           return res.status(404).json({ success: false, message: "Account not found." });
        if (!targetAccount.is_active) return res.status(400).json({ success: false, message: "Account is inactive." });

        let requestQuery = supabase
            .from("card_requests")
            .select("request_id, account_id, card_pin_hash, status")
            .eq("account_id", account_id)
            .in("status", ["pending", "approved"]);
        if (request_id) requestQuery = requestQuery.eq("request_id", request_id);
        const { data: cardRequest, error: requestError } = await requestQuery
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
        if (requestError) throw requestError;
        if (!cardRequest) {
            return res.status(404).json({ success: false, message: "Active physical card request not found." });
        }
        if (!cardRequest.card_pin_hash) {
            return res.status(409).json({
                success: false,
                message: "This card request has no card PIN. Ask the user to submit a new card request.",
            });
        }

        const card_number = await newUniqueCardNumber();
        const plainCVV    = generateCVV();
        const cvv_hash    = await hashCVV(plainCVV);
        const expiry_date = generateExpiry();

        const { data: card, error } = await supabase
            .from("cards")
            .insert({
                account_id,
                card_type: "physical",
                card_number,
                cvv: cvv_hash,
                card_pin_hash: cardRequest.card_pin_hash,
                expiry_date,
                rfid_uid: normalizedUID,
                request_id: cardRequest.request_id,
                status: "active",
                activated_at: new Date().toISOString(),
            })
            .select("card_id, card_type, card_number, expiry_date, rfid_uid, status, activated_at")
            .single();

        if (error) throw error;

        await supabase
            .from("card_requests")
            .update({ status: "issued", card_pin_hash: null, updated_at: new Date().toISOString() })
            .eq("request_id", cardRequest.request_id);

        // Send CVV to user's email — only time it is ever revealed
        if (targetAccount.email) {
            sendCardIssuedEmail(targetAccount.email, plainCVV, "physical", card_number).catch((e) =>
                console.error("[adminActivatePhysical] CVV email failed:", e.message)
            );
        }

        return res.status(201).json({
            success: true,
            message: `Physical card activated for account ${account_id}. CVV has been sent to the account's registered email.`,
            card, // CVV hash NOT returned
        });
    } catch (err) {
        console.error("[adminActivatePhysical]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  ADMIN: Update RFID UID on existing physical card
//  PATCH /api/cards/admin/set-rfid
//  Body: { card_id, rfid_uid }
// ─────────────────────────────────────────────────────────────
const adminSetRFID = async (req, res) => {
    try {
        const { account_type } = req.account;
        if (account_type !== "admin") return res.status(403).json({ success: false, message: "Admin access required." });

        const { card_id, rfid_uid } = req.body;
        if (!card_id || !rfid_uid) return res.status(400).json({ success: false, message: "card_id and rfid_uid are required." });

        const normalizedUID = rfid_uid.toUpperCase();
        const { data: uidClash } = await supabase.from("cards").select("card_id").eq("rfid_uid", normalizedUID).neq("card_id", card_id).maybeSingle();
        if (uidClash) return res.status(409).json({ success: false, message: `RFID UID ${normalizedUID} is already in use.` });

        const { data: card, error } = await supabase.from("cards")
            .update({ rfid_uid: normalizedUID }).eq("card_id", card_id).eq("card_type", "physical")
            .select("card_id, rfid_uid, status").maybeSingle();

        if (error) throw error;
        if (!card) return res.status(404).json({ success: false, message: "Physical card not found." });

        return res.status(200).json({ success: true, message: "RFID UID updated.", card });
    } catch (err) {
        console.error("[adminSetRFID]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  ADMIN: Update daily limit on any card (virtual OR physical/RFID) by card_id
//  PATCH /api/cards/admin/limits
//  Body: { card_id, daily_limit }
// ─────────────────────────────────────────────────────────────
const adminUpdateCardLimits = async (req, res) => {
    try {
        const { account_type } = req.account;
        if (account_type !== "admin") return res.status(403).json({ success: false, message: "Admin access required." });

        const { card_id, daily_limit } = req.body;
        if (!card_id)           return res.status(400).json({ success: false, message: "card_id is required." });
        if (daily_limit === undefined) return res.status(400).json({ success: false, message: "daily_limit is required." });

        const v = parseFloat(daily_limit);
        if (isNaN(v) || v < 0 || v > 1000000) {
            return res.status(400).json({ success: false, message: "daily_limit must be between 0 and 1,000,000." });
        }

        const { data: card, error } = await supabase.from("cards")
            .update({ daily_limit: v }).eq("card_id", card_id)
            .select("card_id, card_type, rfid_uid, status, daily_limit").maybeSingle();

        if (error) throw error;
        if (!card) return res.status(404).json({ success: false, message: "Card not found." });

        return res.status(200).json({ success: true, message: `Daily limit updated to NPR ${v.toLocaleString("en-IN")} on ${card.card_type} card.`, card });
    } catch (err) {
        console.error("[adminUpdateCardLimits]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  ADMIN: Block any card (virtual or physical/RFID)
//  POST /api/cards/admin/block
//  Body: { card_id, reason? }
// ─────────────────────────────────────────────────────────────
const adminBlockCard = async (req, res) => {
    try {
        const { account_type } = req.account;
        if (account_type !== "admin") return res.status(403).json({ success: false, message: "Admin access required." });

        const { card_id, reason } = req.body;
        if (!card_id) return res.status(400).json({ success: false, message: "card_id is required." });

        const { data: card, error } = await supabase.from("cards")
            .update({ status: "blocked", blocked_at: new Date().toISOString(), block_reason: reason || "Blocked by admin" })
            .eq("card_id", card_id)
            .select("card_id, card_type, rfid_uid, status").maybeSingle();

        if (error) throw error;
        if (!card) return res.status(404).json({ success: false, message: "Card not found." });

        return res.status(200).json({ success: true, message: "Card blocked.", card });
    } catch (err) {
        console.error("[adminBlockCard]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  ADMIN: Unblock a card
//  POST /api/cards/admin/unblock
//  Body: { card_id }
// ─────────────────────────────────────────────────────────────
const adminUnblockCard = async (req, res) => {
    try {
        const { account_type } = req.account;
        if (account_type !== "admin") return res.status(403).json({ success: false, message: "Admin access required." });

        const { card_id } = req.body;
        if (!card_id) return res.status(400).json({ success: false, message: "card_id is required." });

        const { data: card, error } = await supabase.from("cards")
            .update({ status: "active", blocked_at: null, block_reason: null })
            .eq("card_id", card_id).eq("status", "blocked")
            .select("card_id, card_type, status").maybeSingle();

        if (error) throw error;
        if (!card) return res.status(404).json({ success: false, message: "Blocked card not found." });

        return res.status(200).json({ success: true, message: "Card unblocked.", card });
    } catch (err) {
        console.error("[adminUnblockCard]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  ADMIN: List all physical card requests
//  GET /api/cards/admin/requests?status=pending
// ─────────────────────────────────────────────────────────────
const adminListRequests = async (req, res) => {
    try {
        const { account_type } = req.account;
        if (account_type !== "admin") return res.status(403).json({ success: false, message: "Admin access required." });

        const status = req.query.status || null;
        let query = supabase.from("card_requests")
            .select("request_id, account_id, status, delivery_address, admin_notes, created_at, updated_at")
            .order("created_at", { ascending: false });
        if (status) query = query.eq("status", status);

        const { data: requests, error } = await query;
        if (error) throw error;

        return res.status(200).json({ success: true, requests: requests || [] });
    } catch (err) {
        console.error("[adminListRequests]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  POS: Look up account by RFID UID
//  GET /api/cards/pos/lookup/:rfid_uid
// ─────────────────────────────────────────────────────────────
const posLookupByRFID = async (req, res) => {
    try {
        const { rfid_uid } = req.params;
        const { data: card, error } = await supabase.from("cards")
            .select("card_id, account_id, card_number, status, daily_limit")
            .eq("rfid_uid", rfid_uid.toUpperCase()).eq("card_type", "physical").maybeSingle();

        if (error) throw error;
        if (!card) return res.status(404).json({ success: false, message: "RFID card not found." });
        if (card.status !== "active") {
            return res.status(403).json({ success: false, message: `Card is ${card.status}. Payment declined.` });
        }

        return res.status(200).json({ success: true, card });
    } catch (err) {
        console.error("[posLookupByRFID]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

module.exports = {
    verifyCVV,
    getMyCards,
    issueVirtualCard,
    requestPhysicalCard,
    blockCard,
    updateCardLimits,
    adminActivatePhysical,
    adminSetRFID,
    adminUpdateCardLimits,
    adminBlockCard,
    adminUnblockCard,
    adminListRequests,
    posLookupByRFID,
};
