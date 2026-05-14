const supabase = require("../services/supabaseClient");

// ─────────────────────────────────────────────────────────────
//  GET STATEMENTS (paginated)
//  GET /api/transactions
//  Returns the authenticated account's transaction history
//  with the logo logic:
//    - Org counterparty  → show org's profile_picture_url
//    - User counterparty → null (frontend shows wallet icon)
//
//  Query params:
//    page    number  page number (default: 1)
//    limit   number  items per page (default: 20, max: 50)
//    type    string  "sent" | "received" | "all" (default: "all")
// ─────────────────────────────────────────────────────────────
const getStatements = async (req, res) => {
    try {
        const { account_id } = req.account;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(
            50,
            Math.max(1, parseInt(req.query.limit) || 20),
        );
        const type = req.query.type || "all";
        const category_id = req.query.category_id
            ? parseInt(req.query.category_id)
            : null;
        const start_date = req.query.start_date || null;
        const end_date = req.query.end_date || null;

        // ── Date range validation ────────────────────────────
        if (start_date && end_date) {
            const start = new Date(start_date);
            const end = new Date(end_date);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid date format. Use YYYY-MM-DD.",
                });
            }
            if (start > end) {
                return res.status(400).json({
                    success: false,
                    message: "start_date must be before end_date.",
                });
            }

            // Max 3-month window
            const threeMonthsAfterStart = new Date(start);
            threeMonthsAfterStart.setMonth(
                threeMonthsAfterStart.getMonth() + 3,
            );
            if (end > threeMonthsAfterStart) {
                return res.status(400).json({
                    success: false,
                    message: "Date range cannot exceed 3 months.",
                });
            }
        } else if (start_date && !end_date) {
            // If only start_date is given, cap end at start + 3 months (or today, whichever is earlier)
        } else if (!start_date && end_date) {
            return res.status(400).json({
                success: false,
                message: "start_date is required when end_date is provided.",
            });
        }

        const offset = (page - 1) * limit;

        // ── Build base query helper ───────────────────────────
        const buildBase = (matchCol) => {
            let q = supabase
                .from("statement_view")
                .select("*", { count: "exact" })
                .eq(matchCol, account_id);

            if (category_id) q = q.eq("category_id", category_id);
            if (start_date)  q = q.gte("created_at", `${start_date}T00:00:00.000Z`);
            if (end_date)    q = q.lte("created_at", `${end_date}T23:59:59.999Z`);
            return q;
        };

        let transactions, count, error;

        if (type === "sent") {
            ({ data: transactions, count, error } = await buildBase("sender_account_id")
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1));
        } else if (type === "received") {
            ({ data: transactions, count, error } = await buildBase("receiver_account_id")
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1));
        } else {
            // Fetch both sent and received separately then merge — avoids
            // the Supabase JS .or() + count:exact bug on views.
            const [sentRes, receivedRes] = await Promise.all([
                buildBase("sender_account_id").select("*"),
                buildBase("receiver_account_id").select("*"),
            ]);

            if (sentRes.error) throw sentRes.error;
            if (receivedRes.error) throw receivedRes.error;

            // Merge, deduplicate by transaction_id, sort, then paginate
            const seen = new Set();
            const merged = [...(sentRes.data || []), ...(receivedRes.data || [])]
                .filter((txn) => {
                    if (seen.has(txn.transaction_id)) return false;
                    seen.add(txn.transaction_id);
                    return true;
                })
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            count = merged.length;
            transactions = merged.slice(offset, offset + limit);
            error = null;
        }

        if (error) throw error;

        // Shape the response for the statements page
        const statements = (transactions || []).map((txn) => {
            const isSender = txn.sender_account_id === account_id;

            const SYSTEM_ACCOUNT_ID = "00000000-0000-0000-0000-000000000000";
            const counterpartyAccountId = isSender
                ? txn.receiver_account_id
                : txn.sender_account_id;
            const isGiftCard = counterpartyAccountId === SYSTEM_ACCOUNT_ID;

            // Logo logic:
            //   - Gift card system account → null (frontend shows gift card icon)
            //   - If counterparty is an org  → show their logo
            //   - If counterparty is a user  → null (frontend shows wallet icon)
            const counterpartyIsOrg = isSender
                ? txn.receiver_account_type === "organization"
                : txn.sender_account_type === "organization";

            const counterpartyLogo = counterpartyIsOrg
                ? isSender
                    ? txn.receiver_logo
                    : txn.sender_logo
                : null;

            return {
                transaction_id: txn.transaction_id,
                type: isSender ? "sent" : "received",
                amount: parseFloat(txn.amount),
                currency: "NPR",
                balance_after: parseFloat(
                    isSender
                        ? txn.sender_balance_after
                        : txn.receiver_balance_after,
                ),
                counterparty: {
                    account_id: counterpartyAccountId,
                    account_type: isGiftCard
                        ? "system"
                        : isSender
                        ? txn.receiver_account_type
                        : txn.sender_account_type,
                    display_name: isGiftCard
                        ? "Gift Card"
                        : isSender
                        ? txn.receiver_display_name
                        : txn.sender_display_name,
                    profile_picture: isGiftCard ? null : counterpartyLogo,
                },
                category: txn.category_name || null,
                category_icon: txn.category_icon || null,
                remarks: txn.remarks || null,
                method: txn.method,
                status: txn.status,
                created_at: txn.created_at,
            };
        });

        return res.status(200).json({
            success: true,
            statements,
            pagination: {
                page,
                limit,
                total: count || 0,
                total_pages: Math.ceil((count || 0) / limit),
                has_next: offset + limit < (count || 0),
            },
        });
    } catch (err) {
        console.error("[getStatements]", err);
        return res.status(500).json({
            success: false,
            message: "Server error.",
            error: err.message,
        });
    }
};

// ─────────────────────────────────────────────────────────────
//  GET TRANSACTION DETAIL
//  GET /api/transactions/:transaction_id
//  Full detail view — for the "detailed statement" page
// ─────────────────────────────────────────────────────────────
const getTransactionDetail = async (req, res) => {
    try {
        const { account_id } = req.account;
        const { transaction_id } = req.params;

        const { data: txn, error } = await supabase
            .from("statement_view")
            .select("*")
            .eq("transaction_id", transaction_id)
            .maybeSingle();

        if (error) throw error;

        if (!txn) {
            return res
                .status(404)
                .json({ success: false, message: "Transaction not found." });
        }

        // Verify this user is part of this transaction
        const isSender = txn.sender_account_id === account_id;
        const isReceiver = txn.receiver_account_id === account_id;

        if (!isSender && !isReceiver) {
            return res.status(403).json({
                success: false,
                message: "You do not have access to this transaction.",
            });
        }

        const SYSTEM_ACCOUNT_ID = "00000000-0000-0000-0000-000000000000";
        const senderIsSystem = txn.sender_account_id === SYSTEM_ACCOUNT_ID;
        const receiverIsSystem = txn.receiver_account_id === SYSTEM_ACCOUNT_ID;

        const counterpartyIsOrg = isSender
            ? txn.receiver_account_type === "organization"
            : txn.sender_account_type === "organization";

        return res.status(200).json({
            success: true,
            transaction: {
                transaction_id: txn.transaction_id,
                type: isSender ? "sent" : "received",
                amount: parseFloat(txn.amount),
                currency: "NPR",
                balance_after: parseFloat(
                    isSender
                        ? txn.sender_balance_after
                        : txn.receiver_balance_after,
                ),

                sender: {
                    account_id: txn.sender_account_id,
                    account_type: senderIsSystem ? "system" : txn.sender_account_type,
                    display_name: senderIsSystem ? "Gift Card" : txn.sender_display_name,
                    phone_number: senderIsSystem ? null : txn.sender_phone,
                    profile_picture: senderIsSystem
                        ? null
                        : txn.sender_account_type === "organization"
                            ? txn.sender_logo
                            : null,
                },

                receiver: {
                    account_id: txn.receiver_account_id,
                    account_type: receiverIsSystem ? "system" : txn.receiver_account_type,
                    display_name: receiverIsSystem ? "Gift Card" : txn.receiver_display_name,
                    phone_number: receiverIsSystem ? null : txn.receiver_phone,
                    profile_picture: receiverIsSystem
                        ? null
                        : txn.receiver_account_type === "organization"
                            ? txn.receiver_logo
                            : null,
                },

                category: {
                    category_id: txn.category_id || null,
                    name: txn.category_name || null,
                    icon: txn.category_icon || null,
                },

                remarks: txn.remarks || null,
                method: txn.method,
                status: txn.status,
                created_at: txn.created_at,
            },
        });
    } catch (err) {
        console.error("[getTransactionDetail]", err);
        return res.status(500).json({
            success: false,
            message: "Server error.",
            error: err.message,
        });
    }
};

// ─────────────────────────────────────────────────────────────
//  GET CATEGORIES
//  GET /api/transactions/categories
//  Returns all active transaction categories for frontend dropdowns
// ─────────────────────────────────────────────────────────────
const getCategories = async (req, res) => {
    try {
        const { data: categories, error } = await supabase
            .from("transaction_categories")
            .select("category_id, name, icon_url, icon_type, color, sort_order")
            .eq("is_active", true)
            .order("sort_order", { ascending: true });

        if (error) throw error;

        return res
            .status(200)
            .json({ success: true, categories: categories || [] });
    } catch (err) {
        console.error("[getCategories]", err);
        return res.status(500).json({
            success: false,
            message: "Server error.",
            error: err.message,
        });
    }
};

module.exports = {
    getStatements,
    getTransactionDetail,
    getCategories,
};