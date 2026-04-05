const bcrypt = require("bcrypt");
const supabase = require("../services/supabaseClient");

const SALT_ROUNDS = 10;

// Bootstrap code for creating the very first admin when none exist.
// Set ADMIN_BOOTSTRAP_CODE in your .env file.
const BOOTSTRAP_CODE = process.env.ADMIN_BOOTSTRAP_CODE || null;

// ─────────────────────────────────────────────────────────────
//  CREATE ADMIN
//  POST /api/admin/create
//
//  Two modes:
//  1. Bootstrap mode  — no admins exist yet → body must include
//                       { bootstrap_code } matching ADMIN_BOOTSTRAP_CODE
//  2. Normal mode     — caller must already be an authenticated admin
//
//  Body: { email, password, full_name, bootstrap_code? }
// ─────────────────────────────────────────────────────────────
const createAdmin = async (req, res) => {
    try {
        const { email, password, full_name, bootstrap_code } = req.body;

        if (!email || !password || !full_name) {
            return res.status(400).json({
                success: false,
                message: "email, password, and full_name are required.",
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters.",
            });
        }

        // ── Determine authorisation mode ──────────────────────
        const callerIsAdmin =
            req.account && req.account.account_type === "admin";

        if (!callerIsAdmin) {
            // Bootstrap mode: only allowed if zero admins exist
            const { count, error: countError } = await supabase
                .from("admins")
                .select("admin_id", { count: "exact", head: true });

            if (countError) throw countError;

            if (count > 0) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Admin accounts already exist. You must be logged in as an admin to create another.",
                });
            }

            // Verify bootstrap code
            if (!BOOTSTRAP_CODE) {
                return res.status(403).json({
                    success: false,
                    message:
                        "No ADMIN_BOOTSTRAP_CODE is configured on this server. Set it in your .env file.",
                });
            }

            if (bootstrap_code !== BOOTSTRAP_CODE) {
                return res.status(403).json({
                    success: false,
                    message: "Invalid bootstrap code.",
                });
            }
        }

        const normalizedEmail = email.toLowerCase().trim();

        // ── Check email availability ──────────────────────────
        const { data: existing } = await supabase
            .from("accounts")
            .select("account_id")
            .eq("email", normalizedEmail)
            .maybeSingle();

        if (existing) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists.",
            });
        }

        // ── Create account ────────────────────────────────────
        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        const { data: accountData, error: accountError } = await supabase
            .from("accounts")
            .insert({
                account_type: "admin",
                email: normalizedEmail,
                password_hash,
                is_verified: true,
            })
            .select("account_id, email")
            .single();

        if (accountError) throw accountError;

        const { account_id } = accountData;

        const { error: adminError } = await supabase.from("admins").insert({
            account_id,
            full_name: full_name.trim(),
        });
        if (adminError) throw adminError;

        // Admins also get a wallet
        const { error: walletError } = await supabase.from("wallets").insert({
            account_id,
            balance: 0.0,
            currency: "NPR",
        });
        if (walletError) throw walletError;

        return res.status(201).json({
            success: true,
            message: "Admin account created successfully.",
            admin: { account_id, email: normalizedEmail, full_name },
        });
    } catch (err) {
        console.error("[createAdmin]", err);
        return res
            .status(500)
            .json({ success: false, message: "Server error.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  SUBMIT VERIFICATION REQUEST  (user action)
//  POST /api/admin/verification/request
//  Headers: Authorization: Bearer <token>   (must be a user)
//  Body: { dob }   — e.g. "1995-08-20"
//
//  • Saves DOB on the users row
//  • Creates a verification_requests row with status=pending
//  • Rejects if a pending request already exists
// ─────────────────────────────────────────────────────────────
const submitVerificationRequest = async (req, res) => {
    try {
        const { account_id, account_type } = req.account;
        const { dob } = req.body;

        if (account_type !== "user") {
            return res.status(403).json({
                success: false,
                message: "Only user accounts can submit verification requests.",
            });
        }

        if (!dob) {
            return res
                .status(400)
                .json({ success: false, message: "dob (date of birth) is required." });
        }

        // Basic date format validation
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
            return res.status(400).json({
                success: false,
                message: "dob must be in YYYY-MM-DD format.",
            });
        }

        const dobDate = new Date(dob);
        if (isNaN(dobDate.getTime())) {
            return res.status(400).json({ success: false, message: "Invalid date of birth." });
        }

        // Must be at least 16 years old
        const minAge = new Date();
        minAge.setFullYear(minAge.getFullYear() - 16);
        if (dobDate > minAge) {
            return res.status(400).json({
                success: false,
                message: "You must be at least 16 years old.",
            });
        }

        // Check for existing pending request
        const { data: existing } = await supabase
            .from("verification_requests")
            .select("request_id, status")
            .eq("account_id", account_id)
            .eq("status", "pending")
            .maybeSingle();

        if (existing) {
            return res.status(409).json({
                success: false,
                message: "You already have a pending verification request. Please wait for it to be reviewed.",
            });
        }

        // Update DOB on the users table
        const { error: dobError } = await supabase
            .from("users")
            .update({ dob, updated_at: new Date().toISOString() })
            .eq("account_id", account_id);

        if (dobError) throw dobError;

        // Insert verification request
        const { data: request, error: reqError } = await supabase
            .from("verification_requests")
            .insert({ account_id, dob })
            .select("request_id, status, created_at")
            .single();

        if (reqError) throw reqError;

        return res.status(201).json({
            success: true,
            message: "Verification request submitted. An admin will review it shortly.",
            request,
        });
    } catch (err) {
        console.error("[submitVerificationRequest]", err);
        return res
            .status(500)
            .json({ success: false, message: "Server error.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  LIST VERIFICATION REQUESTS  (admin action)
//  GET /api/admin/verification/requests
//  Query: status=pending|approved|rejected  (default: pending)
//         page, limit
// ─────────────────────────────────────────────────────────────
const listVerificationRequests = async (req, res) => {
    try {
        const status = req.query.status || "pending";
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;

        const validStatuses = ["pending", "approved", "rejected"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `status must be one of: ${validStatuses.join(", ")}.`,
            });
        }

        const { data, error, count } = await supabase
            .from("verification_requests")
            .select(
                `
                request_id,
                status,
                dob,
                admin_notes,
                created_at,
                updated_at,
                account_id,
                reviewed_by
                `,
                { count: "exact" }
            )
            .eq("status", status)
            .order("created_at", { ascending: status === "pending" })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        // Enrich with user details
        const enriched = await Promise.all(
            (data || []).map(async (req_item) => {
                const { data: userInfo } = await supabase
                    .from("users")
                    .select("full_name")
                    .eq("account_id", req_item.account_id)
                    .maybeSingle();

                const { data: accountInfo } = await supabase
                    .from("accounts")
                    .select("email, phone_number, profile_picture_url")
                    .eq("account_id", req_item.account_id)
                    .maybeSingle();

                return {
                    ...req_item,
                    user: {
                        full_name: userInfo?.full_name || null,
                        email: accountInfo?.email || null,
                        phone_number: accountInfo?.phone_number || null,
                        profile_picture_url: accountInfo?.profile_picture_url || null,
                    },
                };
            })
        );

        return res.status(200).json({
            success: true,
            data: enriched,
            pagination: {
                page,
                limit,
                total: count || 0,
                total_pages: Math.ceil((count || 0) / limit),
            },
        });
    } catch (err) {
        console.error("[listVerificationRequests]", err);
        return res
            .status(500)
            .json({ success: false, message: "Server error.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  GET SINGLE VERIFICATION REQUEST  (admin action)
//  GET /api/admin/verification/requests/:request_id
// ─────────────────────────────────────────────────────────────
const getVerificationRequest = async (req, res) => {
    try {
        const { request_id } = req.params;

        const { data: request, error } = await supabase
            .from("verification_requests")
            .select("*")
            .eq("request_id", request_id)
            .maybeSingle();

        if (error) throw error;
        if (!request) {
            return res
                .status(404)
                .json({ success: false, message: "Verification request not found." });
        }

        // Get full user details
        const { data: userInfo } = await supabase
            .from("users")
            .select("full_name, dob")
            .eq("account_id", request.account_id)
            .maybeSingle();

        const { data: accountInfo } = await supabase
            .from("accounts")
            .select("email, phone_number, profile_picture_url, created_at")
            .eq("account_id", request.account_id)
            .maybeSingle();

        // Get their transaction count as a trust signal
        const { count: txnCount } = await supabase
            .from("transactions")
            .select("transaction_id", { count: "exact", head: true })
            .or(
                `sender_account_id.eq.${request.account_id},receiver_account_id.eq.${request.account_id}`
            );

        // Get wallet balance
        const { data: wallet } = await supabase
            .from("wallets")
            .select("balance, currency")
            .eq("account_id", request.account_id)
            .maybeSingle();

        return res.status(200).json({
            success: true,
            data: {
                ...request,
                user: {
                    full_name: userInfo?.full_name || null,
                    dob_on_profile: userInfo?.dob || null,
                    email: accountInfo?.email || null,
                    phone_number: accountInfo?.phone_number || null,
                    profile_picture_url: accountInfo?.profile_picture_url || null,
                    account_created_at: accountInfo?.created_at || null,
                    transaction_count: txnCount || 0,
                    wallet_balance: wallet?.balance || 0,
                    wallet_currency: wallet?.currency || "NPR",
                },
            },
        });
    } catch (err) {
        console.error("[getVerificationRequest]", err);
        return res
            .status(500)
            .json({ success: false, message: "Server error.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  REVIEW VERIFICATION REQUEST  (admin action)
//  POST /api/admin/verification/requests/:request_id/review
//  Body: { action: "approve" | "reject", admin_notes? }
//
//  On approve → sets accounts.is_verified = true
//  On reject  → leaves is_verified = false; user can resubmit
// ─────────────────────────────────────────────────────────────
const reviewVerificationRequest = async (req, res) => {
    try {
        const { request_id } = req.params;
        const { action, admin_notes } = req.body;
        const { account_id: admin_account_id } = req.account;

        if (!action || !["approve", "reject"].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'action must be "approve" or "reject".',
            });
        }

        // Fetch the request
        const { data: request, error: fetchError } = await supabase
            .from("verification_requests")
            .select("*")
            .eq("request_id", request_id)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!request) {
            return res
                .status(404)
                .json({ success: false, message: "Verification request not found." });
        }

        if (request.status !== "pending") {
            return res.status(409).json({
                success: false,
                message: `This request has already been ${request.status}.`,
            });
        }

        const newStatus = action === "approve" ? "approved" : "rejected";
        const now = new Date().toISOString();

        // Update the request
        const { error: updateReqError } = await supabase
            .from("verification_requests")
            .update({
                status: newStatus,
                admin_notes: admin_notes || null,
                reviewed_by: admin_account_id,
                updated_at: now,
            })
            .eq("request_id", request_id);

        if (updateReqError) throw updateReqError;

        // If approved, mark the account as verified
        if (action === "approve") {
            const { error: verifyError } = await supabase
                .from("accounts")
                .update({ is_verified: true, updated_at: now })
                .eq("account_id", request.account_id);

            if (verifyError) throw verifyError;
        }

        return res.status(200).json({
            success: true,
            message: `Verification request ${newStatus}.`,
            data: { request_id, status: newStatus, reviewed_by: admin_account_id },
        });
    } catch (err) {
        console.error("[reviewVerificationRequest]", err);
        return res
            .status(500)
            .json({ success: false, message: "Server error.", error: err.message });
    }
};

module.exports = {
    createAdmin,
    submitVerificationRequest,
    listVerificationRequests,
    getVerificationRequest,
    reviewVerificationRequest,
};
