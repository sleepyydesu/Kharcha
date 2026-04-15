const supabase = require("../services/supabaseClient");
const bcrypt = require("bcrypt");
const { dispatchQRWebhook } = require("./qrCodeController");

// ─────────────────────────────────────────────────────────────
//  GET WALLET
//  GET /api/wallet
//  Returns the authenticated user's wallet balance and details
// ─────────────────────────────────────────────────────────────
const getWallet = async (req, res) => {
    try {
        const { account_id } = req.account;

        const { data: wallet, error } = await supabase
            .from("wallets")
            .select(
                "wallet_id, balance, currency, is_active, created_at, updated_at",
            )
            .eq("account_id", account_id)
            .single();

        if (error) throw error;

        if (!wallet) {
            return res
                .status(404)
                .json({ success: false, message: "Wallet not found." });
        }

        if (!wallet.is_active) {
            return res.status(403).json({
                success: false,
                message:
                    "Your wallet has been suspended. Please contact support.",
            });
        }

        return res.status(200).json({
            success: true,
            wallet: {
                wallet_id: wallet.wallet_id,
                balance: parseFloat(wallet.balance),
                currency: wallet.currency,
                is_active: wallet.is_active,
                created_at: wallet.created_at,
                updated_at: wallet.updated_at,
            },
        });
    } catch (err) {
        console.error("[getWallet]", err);
        return res.status(500).json({
            success: false,
            message: "Server error.",
            error: err.message,
        });
    }
};

// ─────────────────────────────────────────────────────────────
//  TRANSFER
//  POST /api/wallet/transfer
//
//  Used for ALL transactions in the app — user-to-user, user-to-org,
//  org-to-user, org-to-org. The caller is always the sender.
//
//  Body:
//    receiver_identifier  string  — phone number OR account_id (UUID) of receiver
//    amount               number  — amount in NPR (must be > 0)
//    category_id?         number  — optional category from transaction_categories
//    remarks?             string  — optional note / memo
// ─────────────────────────────────────────────────────────────
const transfer = async (req, res) => {
    try {
        const { account_id: sender_account_id } = req.account;
        const {
            receiver_identifier,
            amount,
            category_id,
            remarks,
            mpin,
            qr_id,
        } = req.body;

        // ── Verification gate ─────────────────────────────────
        // Only verified accounts (and organisations) may send money.
        const { data: senderAccount, error: senderErr } = await supabase
            .from("accounts")
            .select("is_verified, account_type, mpin_hash")
            .eq("account_id", sender_account_id)
            .single();

        if (senderErr) throw senderErr;

        if (
            senderAccount.account_type === "user" &&
            !senderAccount.is_verified
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Your account is not yet verified. Please submit a verification request under /api/admin/verification/request and wait for admin approval before making transactions.",
            });
        }

        // ── MPIN gate ─────────────────────────────────────────
        if (!mpin) {
            return res.status(400).json({
                success: false,
                message: "mpin is required to authorise a transfer.",
            });
        }

        if (!senderAccount.mpin_hash) {
            return res.status(403).json({
                success: false,
                message:
                    "You have not set up an MPIN yet. Please set one via /api/auth/mpin/setup before making transfers.",
            });
        }

        const mpinValid = await bcrypt.compare(
            mpin.toString(),
            senderAccount.mpin_hash,
        );
        if (!mpinValid) {
            return res.status(401).json({
                success: false,
                message: "Incorrect MPIN.",
            });
        }

        // ── Validation ────────────────────────────────────────
        if (!receiver_identifier) {
            return res.status(400).json({
                success: false,
                message:
                    "receiver_identifier is required (phone number or account ID).",
            });
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
                message: "Minimum transfer amount is NPR 1.",
            });
        }

        // ── Resolve receiver account ──────────────────────────
        // receiver_identifier can be:
        //   - A UUID (account_id) for direct transfers
        //   - A phone number for user-friendly transfers
        const isUUID =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                receiver_identifier,
            );

        let receiverQuery = supabase
            .from("accounts")
            .select("account_id, account_type, is_active")
            .maybeSingle();

        if (isUUID) {
            receiverQuery = supabase
                .from("accounts")
                .select("account_id, account_type, is_active")
                .eq("account_id", receiver_identifier)
                .maybeSingle();
        } else {
            // Assume phone number
            receiverQuery = supabase
                .from("accounts")
                .select("account_id, account_type, is_active")
                .eq("phone_number", receiver_identifier.trim())
                .maybeSingle();
        }

        const { data: receiverAccount, error: receiverError } =
            await receiverQuery;

        if (receiverError) throw receiverError;

        if (!receiverAccount) {
            return res.status(404).json({
                success: false,
                message:
                    "Receiver not found. Please check the phone number or ID.",
            });
        }

        if (!receiverAccount.is_active) {
            return res.status(400).json({
                success: false,
                message: "Receiver account is inactive.",
            });
        }

        if (receiverAccount.account_id === sender_account_id) {
            return res.status(400).json({
                success: false,
                message: "You cannot transfer to your own wallet.",
            });
        }

        // ── Execute atomic transfer via Supabase RPC ──────────
        // The PostgreSQL function handles locking, balance check, debit/credit,
        // and transaction record — all in one atomic operation.
        const { data: result, error: transferError } = await supabase.rpc(
            "transfer_funds",
            {
                p_sender_account_id: sender_account_id,
                p_receiver_account_id: receiverAccount.account_id,
                p_amount: parsedAmount,
                p_category_id: category_id || null,
                p_remarks: remarks || null,
            },
        );

        if (transferError) {
            // Parse known error codes from the PostgreSQL function
            const msg = transferError.message || "";
            if (msg.includes("INSUFFICIENT_BALANCE")) {
                return res.status(400).json({
                    success: false,
                    message: "Insufficient wallet balance.",
                });
            }
            if (msg.includes("WALLET_NOT_FOUND")) {
                return res.status(400).json({
                    success: false,
                    message: "Wallet not found for sender or receiver.",
                });
            }
            if (msg.includes("WALLET_INACTIVE")) {
                return res.status(400).json({
                    success: false,
                    message: "One of the wallets is inactive.",
                });
            }
            if (msg.includes("SELF_TRANSFER")) {
                return res.status(400).json({
                    success: false,
                    message: "You cannot transfer to your own wallet.",
                });
            }
            throw transferError;
        }

        // Fetch receiver display name and profile picture for the response
        const profileTable =
            receiverAccount.account_type === "organization"
                ? "organizations"
                : "users";
        const nameField =
            receiverAccount.account_type === "organization"
                ? "organization_name"
                : "full_name";

        const { data: receiverProfile } = await supabase
            .from(profileTable)
            .select(nameField)
            .eq("account_id", receiverAccount.account_id)
            .maybeSingle();

        const { data: receiverAccount2 } = await supabase
            .from("accounts")
            .select("profile_picture_url")
            .eq("account_id", receiverAccount.account_id)
            .maybeSingle();

        const responsePayload = {
            success: true,
            message: "Transfer successful.",
            transaction: {
                transaction_id: result.transaction_id,
                amount: parsedAmount,
                currency: "NPR",
                balance_after: parseFloat(result.sender_balance_after),
                receiver: {
                    account_id: receiverAccount.account_id,
                    account_type: receiverAccount.account_type,
                    display_name: receiverProfile?.[nameField] || "Unknown",
                    profile_picture:
                        receiverAccount2?.profile_picture_url || null,
                },
                remarks: remarks || null,
                method: "Kharcha Wallet",
                status: "completed",
                ...(qr_id ? { qr_id } : {}),
            },
        };

        // Fire webhook + mark session complete if this came from a dynamic QR scan
        if (qr_id) {
            // If qr_id matches a payment_sessions record, mark it as paid.
            // This is what allows the merchant's screen to auto-detect payment.
            // We guard with .eq("status", "pending") so a double-tap is a no-op.
            await supabase
                .from("payment_sessions")
                .update({ status: "success" })
                .eq("session_id", qr_id)
                .eq("status", "pending");

            // Dispatch webhook (non-blocking — external URL can be slow)
            dispatchQRWebhook(qr_id, {
                event: "payment.success",
                qr_id,
                transaction_id: result.transaction_id,
                amount: parsedAmount,
                currency: "NPR",
                remarks: remarks || null,
                timestamp: new Date().toISOString(),
            });
        }

        // Auto-log: expense for sender, income for receiver
        const _today = new Date().toISOString().slice(0, 10);
        const _note = remarks || "Wallet transfer";
        supabase
            .from("expenses")
            .insert({
                user_id: sender_account_id,
                category_id: null,
                amount: parsedAmount,
                note: _note,
                date: _today,
                is_auto: true,
            })
            .then(() => {})
            .catch((e) => console.error("[auto-expense]", e));
        supabase
            .from("income")
            .insert({
                user_id: receiverAccount.account_id,
                amount: parsedAmount,
                source: "Transfer",
                note: _note,
                date: _today,
                is_auto: true,
            })
            .then(() => {})
            .catch((e) => console.error("[auto-income]", e));

        return res.status(200).json(responsePayload);
    } catch (err) {
        console.error("[transfer]", err);
        return res.status(500).json({
            success: false,
            message: "Transfer failed.",
            error: err.message,
        });
    }
};

// ─────────────────────────────────────────────────────────────
//  LOOKUP RECEIVER
//  GET /api/wallet/lookup?identifier=<phone_or_id>
//  Used by the frontend to show receiver info before confirming transfer
// ─────────────────────────────────────────────────────────────
const lookupReceiver = async (req, res) => {
    try {
        const { identifier } = req.query;
        const { account_id: sender_account_id } = req.account;

        if (!identifier) {
            return res.status(400).json({
                success: false,
                message: "identifier query param is required.",
            });
        }

        const isUUID =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                identifier,
            );

        let query = supabase
            .from("accounts")
            .select("account_id, account_type, is_active, phone_number");

        if (isUUID) {
            query = query.eq("account_id", identifier);
        } else {
            query = query.eq("phone_number", identifier.trim());
        }

        const { data: account, error } = await query.maybeSingle();

        if (error) throw error;

        if (!account) {
            return res.status(404).json({
                success: false,
                message: "No account found with this phone number or ID.",
            });
        }

        if (account.account_id === sender_account_id) {
            return res.status(400).json({
                success: false,
                message: "Cannot transfer to your own account.",
            });
        }

        if (!account.is_active) {
            return res
                .status(400)
                .json({ success: false, message: "This account is inactive." });
        }

        // Fetch profile info
        const profileTable =
            account.account_type === "organization" ? "organizations" : "users";
        const nameField =
            account.account_type === "organization"
                ? "organization_name"
                : "full_name";

        const { data: profile } = await supabase
            .from(profileTable)
            .select(nameField)
            .eq("account_id", account.account_id)
            .maybeSingle();

        const { data: accountPic } = await supabase
            .from("accounts")
            .select("profile_picture_url")
            .eq("account_id", account.account_id)
            .maybeSingle();

        return res.status(200).json({
            success: true,
            receiver: {
                account_id: account.account_id,
                account_type: account.account_type,
                display_name: profile?.[nameField] || "Unknown",
                phone_number: account.phone_number,
                profile_picture: accountPic?.profile_picture_url || null,
            },
        });
    } catch (err) {
        console.error("[lookupReceiver]", err);
        return res.status(500).json({
            success: false,
            message: "Server error.",
            error: err.message,
        });
    }
};

module.exports = { getWallet, transfer, lookupReceiver };
