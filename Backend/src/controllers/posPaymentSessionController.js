const bcrypt = require("bcrypt");
const supabase = require("../services/supabaseClient");
const { cardPinLockout } = require("../middleware/securityMiddleware");
const {
    ACTIVE_SESSION_STATUSES,
    generatePaymentSessionId,
    normalizeCardIdentifier,
    parseSessionAmount,
    isExpired,
    mapAuthorizationError,
} = require("../utils/posPaymentUtils");

const SESSION_SELECT =
    "session_id, account_id, amount, currency, description, order_reference, status, expires_at, selected_terminal_id, selected_at, paid_at, transaction_id, paid_by_account_id, created_at, updated_at";

function organizationAccountId(req) {
    return req.account?.account_id || req.apiKey?.account_id;
}

async function audit({ sessionId, accountId, terminalId, cardId, userId, result, reason, metadata }) {
    try {
        await supabase.from("pos_payment_audit_logs").insert({
            session_id: sessionId || null,
            account_id: accountId || null,
            terminal_id: terminalId || null,
            card_id: cardId || null,
            user_account_id: userId || null,
            result,
            failure_reason: reason || null,
            metadata: metadata || {},
        });
    } catch (err) {
        console.error("[posPaymentAudit]", { sessionId, terminalId, result, reason, error: err.message });
    }
}

async function expireSessionIfNeeded(session) {
    if (!session || session.status === "paid" || !isExpired(session.expires_at)) return session;
    if (ACTIVE_SESSION_STATUSES.includes(session.status)) {
        await supabase
            .from("pos_payment_sessions")
            .update({ status: "expired", updated_at: new Date().toISOString() })
            .eq("session_id", session.session_id)
            .in("status", ACTIVE_SESSION_STATUSES);
        return { ...session, status: "expired" };
    }
    return session;
}

const createPaymentSession = async (req, res) => {
    try {
        const accountId = organizationAccountId(req);
        const amount = parseSessionAmount(req.body?.amount);
        const currency = String(req.body?.currency || "NPR").toUpperCase();
        const description = req.body?.description?.trim() || null;
        const orderReference = req.body?.order_reference?.trim() || null;
        const expiresInMinutes = Number(req.body?.expires_in_minutes || 10);

        if (!amount) return res.status(400).json({ success: false, message: "amount must be at least 1." });
        if (currency !== "NPR") return res.status(400).json({ success: false, message: "Only NPR is currently supported." });
        if (!Number.isFinite(expiresInMinutes) || expiresInMinutes < 1 || expiresInMinutes > 15) {
            return res.status(400).json({ success: false, message: "expires_in_minutes must be between 1 and 15." });
        }
        if (description && description.length > 500) {
            return res.status(400).json({ success: false, message: "description must be at most 500 characters." });
        }
        if (orderReference && orderReference.length > 100) {
            return res.status(400).json({ success: false, message: "order_reference must be at most 100 characters." });
        }

        const { data, error } = await supabase
            .from("pos_payment_sessions")
            .insert({
                session_id: generatePaymentSessionId(),
                account_id: accountId,
                amount,
                currency,
                description,
                order_reference: orderReference,
                status: "pending",
                expires_at: new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString(),
            })
            .select(SESSION_SELECT)
            .single();
        if (error) throw error;
        return res.status(201).json({ success: true, session: data });
    } catch (err) {
        console.error("[createPaymentSession]", err);
        return res.status(500).json({ success: false, message: "Failed to create payment session." });
    }
};

const getPaymentSession = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("pos_payment_sessions")
            .select(SESSION_SELECT)
            .eq("session_id", req.params.id)
            .eq("account_id", organizationAccountId(req))
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, message: "Payment session not found." });
        return res.json({ success: true, session: await expireSessionIfNeeded(data) });
    } catch (err) {
        console.error("[getPaymentSession]", err);
        return res.status(500).json({ success: false, message: "Failed to load payment session." });
    }
};

const cancelPaymentSession = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("pos_payment_sessions")
            .update({ status: "cancelled", updated_at: new Date().toISOString() })
            .eq("session_id", req.params.id)
            .eq("account_id", organizationAccountId(req))
            .in("status", ACTIVE_SESSION_STATUSES)
            .select(SESSION_SELECT)
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(409).json({ success: false, message: "Session cannot be cancelled because it is missing or already final." });
        return res.json({ success: true, session: data });
    } catch (err) {
        console.error("[cancelPaymentSession]", err);
        return res.status(500).json({ success: false, message: "Failed to cancel payment session." });
    }
};

const listActivePosSessions = async (req, res) => {
    try {
        const now = new Date().toISOString();
        await supabase
            .from("pos_payment_sessions")
            .update({ status: "expired", updated_at: now })
            .eq("account_id", req.posTerminal.account_id)
            .lt("expires_at", now)
            .in("status", ACTIVE_SESSION_STATUSES);

        const { data, error } = await supabase
            .from("pos_payment_sessions")
            .select(SESSION_SELECT)
            .eq("account_id", req.posTerminal.account_id)
            .gt("expires_at", now)
            .in("status", ACTIVE_SESSION_STATUSES)
            .order("created_at", { ascending: true });
        if (error) throw error;
        return res.json({ success: true, sessions: data || [] });
    } catch (err) {
        console.error("[listActivePosSessions]", err);
        return res.status(500).json({ success: false, message: "Failed to load payment sessions." });
    }
};

const selectPosSession = async (req, res) => {
    const terminal = req.posTerminal;
    try {
        const { data: existing, error: fetchError } = await supabase
            .from("pos_payment_sessions")
            .select(SESSION_SELECT)
            .eq("session_id", req.params.id)
            .eq("account_id", terminal.account_id)
            .maybeSingle();
        if (fetchError) throw fetchError;
        if (!existing) return res.status(404).json({ success: false, message: "Payment session not found." });
        const session = await expireSessionIfNeeded(existing);
        if (session.status === "expired") return res.status(410).json({ success: false, message: "Payment session has expired." });
        if (session.status !== "pending" && session.selected_terminal_id !== terminal.terminal_id) {
            return res.status(409).json({ success: false, message: `Payment session is ${session.status}.` });
        }

        const { data, error } = await supabase
            .from("pos_payment_sessions")
            .update({
                status: "awaiting_card",
                selected_terminal_id: terminal.terminal_id,
                selected_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("session_id", session.session_id)
            .eq("account_id", terminal.account_id)
            .eq("status", session.status)
            .select(SESSION_SELECT)
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(409).json({ success: false, message: "Payment session was selected by another terminal." });
        return res.json({ success: true, session: data });
    } catch (err) {
        console.error("[selectPosSession]", err);
        return res.status(500).json({ success: false, message: "Failed to select payment session." });
    }
};

const lookupPosCard = async (req, res) => {
    try {
        const identifier = normalizeCardIdentifier(req.params.card_identifier);
        if (
            !(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier) ||
                /^[A-Z0-9:_-]{4,64}$/.test(identifier)
            )
        ) {
            return res.status(400).json({ success: false, message: "Invalid card identifier." });
        }

        let query = supabase
            .from("cards")
            .select("card_id, card_type, card_number, rfid_uid, status, expiry_date");
        query = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)
            ? query.eq("card_id", identifier)
            : query.or(`rfid_uid.eq.${identifier},card_number.eq.${identifier}`);

        const { data: card, error } = await query.maybeSingle();
        if (error) throw error;
        if (!card) return res.status(404).json({ success: false, message: "Card not found." });

        const expired = card.expiry_date && new Date(card.expiry_date) < new Date();
        if (card.status !== "active" || expired) {
            return res.status(403).json({
                success: false,
                message: expired ? "Card has expired." : `Card is ${card.status}.`,
            });
        }

        return res.json({
            success: true,
            card: {
                card_id: card.card_id,
                card_type: card.card_type,
                card_last4: card.card_number?.slice(-4) || null,
                status: "active",
            },
        });
    } catch (err) {
        console.error("[lookupPosCard]", err);
        return res.status(500).json({ success: false, message: "Failed to look up card." });
    }
};

const authorizePosSession = async (req, res) => {
    const terminal = req.posTerminal;
    const sessionId = req.params.id;
    const cardIdentifier = normalizeCardIdentifier(req.body?.card_uid || req.body?.card_id);
    const pin = req.body?.pin;
    let card = null;

    const fail = async (status, errorCode, message, reason, extra = {}) => {
        await audit({
            sessionId,
            accountId: terminal.account_id,
            terminalId: terminal.terminal_id,
            cardId: card?.card_id,
            userId: card?.account_id,
            result: "failed",
            reason,
        });
        return res.status(status).json({ success: false, error_code: errorCode, message, ...extra });
    };

    try {
        if (!cardIdentifier || pin === undefined || pin === null) {
            return fail(400, "VALIDATION_ERROR", "card_uid/card_id and pin are required.", "missing_credentials");
        }
        if (
            !/^\d{6}$/.test(String(pin)) ||
            !(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cardIdentifier) ||
                /^[A-Z0-9:_-]{4,64}$/.test(cardIdentifier)
            )
        ) {
            return fail(400, "VALIDATION_ERROR", "card identifier is invalid or pin must be exactly 6 digits.", "invalid_input");
        }

        const { data: session, error: sessionError } = await supabase
            .from("pos_payment_sessions")
            .select(SESSION_SELECT)
            .eq("session_id", sessionId)
            .eq("account_id", terminal.account_id)
            .maybeSingle();
        if (sessionError) throw sessionError;
        if (!session) return fail(404, "SESSION_NOT_FOUND", "Payment session not found.", "session_not_found");
        if (session.status === "paid") {
            await audit({
                sessionId,
                accountId: terminal.account_id,
                terminalId: terminal.terminal_id,
                userId: session.paid_by_account_id,
                result: "already_paid",
                metadata: { transaction_id: session.transaction_id || null },
            });
            return res.json({ success: true, idempotent: true, session });
        }
        const current = await expireSessionIfNeeded(session);
        if (current.status === "expired") return fail(410, "SESSION_EXPIRED", "Payment session has expired.", "session_expired");
        if (["cancelled", "failed"].includes(current.status)) {
            return fail(409, `SESSION_${current.status.toUpperCase()}`, `Payment session is ${current.status}.`, `session_${current.status}`);
        }
        if (current.selected_terminal_id && current.selected_terminal_id !== terminal.terminal_id) {
            return fail(403, "SESSION_TERMINAL_MISMATCH", "Payment session was selected by another terminal.", "terminal_mismatch");
        }

        let cardQuery = supabase
            .from("cards")
            .select("card_id, account_id, status, expiry_date, rfid_uid, card_number, card_pin_hash");
        cardQuery = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cardIdentifier)
            ? cardQuery.eq("card_id", cardIdentifier)
            : cardQuery.or(`rfid_uid.eq.${cardIdentifier},card_number.eq.${cardIdentifier}`);
        const { data: cardData, error: cardError } = await cardQuery.maybeSingle();
        if (cardError) throw cardError;
        card = cardData;
        if (!card) return fail(404, "CARD_NOT_FOUND", "Card not found.", "card_not_found");
        if (card.status !== "active" || (card.expiry_date && new Date(card.expiry_date) < new Date())) {
            return fail(403, "CARD_INACTIVE", "Card is not active.", "card_inactive");
        }

        const { data: account, error: accountError } = await supabase
            .from("accounts")
            .select("account_id, is_active")
            .eq("account_id", card.account_id)
            .maybeSingle();
        if (accountError) throw accountError;
        if (!account?.is_active) return fail(403, "ACCOUNT_INACTIVE", "Cardholder account is inactive.", "account_inactive");
        if (!card.card_pin_hash) return fail(403, "PIN_NOT_SET", "This card does not have a card PIN configured.", "pin_not_set");

        await supabase
            .from("pos_payment_sessions")
            .update({
                status: "awaiting_pin",
                selected_terminal_id: current.selected_terminal_id || terminal.terminal_id,
                selected_at: current.selected_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("session_id", sessionId)
            .eq("account_id", terminal.account_id)
            .in("status", ["pending", "selected", "awaiting_card", "awaiting_pin"]);

        const lockoutKey = `card-pin:${card.card_id}`;
        const locked = cardPinLockout.check(lockoutKey);
        if (locked) {
            return fail(423, "PIN_LOCKED", "PIN is temporarily locked.", "pin_locked", {
                retry_after_seconds: locked.retryAfterSeconds,
            });
        }

        const pinValid = await bcrypt.compare(String(pin), card.card_pin_hash);
        if (!pinValid) {
            const result = cardPinLockout.failure(lockoutKey);
            return fail(
                result.locked ? 423 : 401,
                result.locked ? "PIN_LOCKED" : "INVALID_PIN",
                result.locked ? "PIN is temporarily locked." : "Incorrect PIN.",
                "invalid_pin",
                result.locked
                    ? { retry_after_seconds: result.retryAfterSeconds }
                    : { attempts_remaining: result.failuresRemaining },
            );
        }
        cardPinLockout.success(lockoutKey);

        const { data: paid, error: paymentError } = await supabase.rpc("authorize_pos_payment_session", {
            p_session_id: sessionId,
            p_terminal_id: terminal.terminal_id,
            p_card_id: card.card_id,
        });
        if (paymentError) {
            const mapped = mapAuthorizationError(paymentError.message);
            if (mapped) return fail(mapped.status, mapped.errorCode, mapped.message, mapped.errorCode.toLowerCase());
            throw paymentError;
        }

        const paidSession = Array.isArray(paid) ? paid[0] : paid;
        await audit({
            sessionId,
            accountId: terminal.account_id,
            terminalId: terminal.terminal_id,
            cardId: card.card_id,
            userId: card.account_id,
            result: paidSession?.idempotent ? "already_paid" : "paid",
            metadata: { transaction_id: paidSession?.transaction_id || null },
        });
        return res.json({
            success: true,
            idempotent: Boolean(paidSession?.idempotent),
            message: paidSession?.idempotent ? "Payment was already completed." : "Payment successful.",
            session: paidSession,
        });
    } catch (err) {
        console.error("[authorizePosSession]", {
            sessionId,
            terminalId: terminal.terminal_id,
            cardId: card?.card_id,
            error: err.message,
        });
        return fail(500, "SERVER_ERROR", "Payment authorization failed.", "server_error");
    }
};

module.exports = {
    createPaymentSession,
    getPaymentSession,
    cancelPaymentSession,
    listActivePosSessions,
    selectPosSession,
    lookupPosCard,
    authorizePosSession,
};
