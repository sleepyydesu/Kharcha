const bcrypt = require("bcrypt");
const supabase = require("../services/supabaseClient");
const { generateOTP } = require("../utils/otpUtils");
const { sendOTPEmail } = require("../utils/emailUtils");
const {
    generateSignupToken,
    verifySignupToken,
    generateAuthToken,
} = require("../utils/jwtUtils");

const SALT_ROUNDS = 10;
const OTP_EXPIRY_MINUTES = 15;
const VALID_ACCOUNT_TYPES = ["user", "organization", "admin"];

// ─────────────────────────────────────────────────────────────
//  SIGNUP — Step 1: Check email & phone availability
//  POST /api/auth/signup/check
//  Body: { email, phone_number?, account_type }
// ─────────────────────────────────────────────────────────────
const checkAvailability = async (req, res) => {
    try {
        const { email, phone_number, account_type } = req.body;

        if (!email || !account_type) {
            return res.status(400).json({
                success: false,
                message: "Email and account type are required.",
            });
        }

        if (!VALID_ACCOUNT_TYPES.includes(account_type)) {
            return res.status(400).json({
                success: false,
                message: `Invalid account type. Must be one of: ${VALID_ACCOUNT_TYPES.join(", ")}.`,
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check email
        const { data: existingEmail } = await supabase
            .from("accounts")
            .select("account_id")
            .eq("email", normalizedEmail)
            .maybeSingle();

        if (existingEmail) {
            return res.status(409).json({
                success: false,
                field: "email",
                message: "An account with this email already exists.",
            });
        }

        // Check phone if provided
        if (phone_number) {
            const { data: existingPhone } = await supabase
                .from("accounts")
                .select("account_id")
                .eq("phone_number", phone_number.trim())
                .maybeSingle();

            if (existingPhone) {
                return res.status(409).json({
                    success: false,
                    field: "phone_number",
                    message: "An account with this phone number already exists.",
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: "Email and phone are available.",
        });
    } catch (err) {
        console.error("[checkAvailability]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  SIGNUP — Step 2: Send OTP
//  POST /api/auth/signup/send-otp
//  Body: { email }
// ─────────────────────────────────────────────────────────────
const sendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required." });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

        // Invalidate any previous unused signup OTPs for this email
        await supabase
            .from("otp_verifications")
            .update({ is_used: true })
            .eq("email", normalizedEmail)
            .eq("otp_type", "signup")
            .eq("is_used", false);

        // Insert new OTP
        const { error: insertError } = await supabase.from("otp_verifications").insert({
            email: normalizedEmail,
            otp_code: otp,
            otp_type: "signup",
            expires_at: expiresAt,
        });

        if (insertError) throw insertError;

        // Send email (logs to console in dev if SMTP not configured)
        await sendOTPEmail(normalizedEmail, otp);

        return res.status(200).json({
            success: true,
            message: `Verification code sent to ${normalizedEmail}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`,
        });
    } catch (err) {
        console.error("[sendOTP]", err);
        return res.status(500).json({ success: false, message: "Failed to send OTP.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  SIGNUP — Step 3: Verify OTP
//  POST /api/auth/signup/verify-otp
//  Body: { email, otp }
//  Returns: { signup_token } — pass this to /complete
// ─────────────────────────────────────────────────────────────
const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ success: false, message: "Email and OTP are required." });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const { data, error } = await supabase
            .from("otp_verifications")
            .select("*")
            .eq("email", normalizedEmail)
            .eq("otp_code", otp.toString().trim())
            .eq("otp_type", "signup")
            .eq("is_used", false)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return res.status(400).json({ success: false, message: "Invalid verification code." });
        }

        if (new Date(data.expires_at) < new Date()) {
            return res.status(400).json({
                success: false,
                message: "Verification code has expired. Please request a new one.",
            });
        }

        // Mark OTP as used
        await supabase.from("otp_verifications").update({ is_used: true }).eq("id", data.id);

        // Issue short-lived signup token (15 min) to authorize the /complete step
        const signupToken = generateSignupToken({ email: normalizedEmail });

        return res.status(200).json({
            success: true,
            message: "Email verified successfully.",
            signup_token: signupToken,
        });
    } catch (err) {
        console.error("[verifyOTP]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  SIGNUP — Step 4: Complete signup
//  POST /api/auth/signup/complete
//  Body: {
//    signup_token,
//    account_type,
//    password,
//    phone_number?,          -- optional
//    full_name,              -- required for: user, admin
//    organization_name,      -- required for: organization
//  }
//  NOTE: MPIN is set later via the profile/settings page.
// ─────────────────────────────────────────────────────────────
const completeSignup = async (req, res) => {
    try {
        const {
            signup_token,
            account_type,
            password,
            phone_number,
            full_name,
            organization_name,
        } = req.body;

        // ── Basic validation ─────────────────────────────────
        if (!signup_token || !account_type || !password) {
            return res.status(400).json({
                success: false,
                message: "signup_token, account_type, and password are required.",
            });
        }

        if (!VALID_ACCOUNT_TYPES.includes(account_type)) {
            return res.status(400).json({ success: false, message: "Invalid account type." });
        }

        if (account_type === "user" && !full_name) {
            return res.status(400).json({ success: false, message: "Full name is required." });
        }

        if (account_type === "organization" && !organization_name) {
            return res.status(400).json({ success: false, message: "Organization name is required." });
        }

        if (account_type === "admin" && !full_name) {
            return res.status(400).json({ success: false, message: "Full name is required." });
        }

        // ── Validate signup_token ─────────────────────────────
        const decoded = verifySignupToken(signup_token);
        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: "Signup session has expired or is invalid. Please start over.",
            });
        }

        const email = decoded.email;

        // ── Hash password ─────────────────────────────────────
        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        // ── Insert into accounts ──────────────────────────────
        const { data: accountData, error: accountError } = await supabase
            .from("accounts")
            .insert({
                account_type,
                email,
                phone_number: phone_number ? phone_number.trim() : null,
                password_hash,
                mpin_hash: null,   // set via profile later
                is_verified: true,
            })
            .select("account_id, account_type, email")
            .single();

        if (accountError) {
            if (accountError.code === "23505") {
                return res.status(409).json({
                    success: false,
                    message: "An account with this email or phone number already exists.",
                });
            }
            throw accountError;
        }

        const { account_id } = accountData;

        // ── Insert into type-specific table ───────────────────
        if (account_type === "user") {
            const { error } = await supabase.from("users").insert({
                account_id,
                full_name: full_name.trim(),
            });
            if (error) throw error;
        } else if (account_type === "organization") {
            const { error } = await supabase.from("organizations").insert({
                account_id,
                organization_name: organization_name.trim(),
            });
            if (error) throw error;
        } else if (account_type === "admin") {
            const { error } = await supabase.from("admins").insert({
                account_id,
                full_name: full_name.trim(),
            });
            if (error) throw error;
        }

        // ── Create wallet for the new account ────────────────
        const { error: walletError } = await supabase.from("wallets").insert({
            account_id,
            balance:  0.00,
            currency: "NPR",
        });
        if (walletError) throw walletError;

        // ── Issue auth token ──────────────────────────────────
        const token = generateAuthToken({ account_id, account_type, email });

        return res.status(201).json({
            success: true,
            message: "Account created successfully.",
            token,
            account: { account_id, account_type, email },
        });
    } catch (err) {
        console.error("[completeSignup]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  SIGNIN
//  POST /api/auth/signin
//  Body: { identifier, credential }
//
//  identifier  → email address  OR  phone number
//  credential  → password  OR  6-digit MPIN
//
//  Detection logic:
//    identifier: contains "@"  → treat as email, else phone number
//    credential: exactly 6 digits (numeric) → try as MPIN first,
//                fall back to password if MPIN not set up yet
// ─────────────────────────────────────────────────────────────
const signin = async (req, res) => {
    try {
        const { identifier, credential } = req.body;

        if (!identifier || !credential) {
            return res.status(400).json({
                success: false,
                message: "identifier and credential are required.",
            });
        }

        const isEmail = identifier.includes("@");
        const lookupField = isEmail ? "email" : "phone_number";
        const lookupValue = isEmail ? identifier.toLowerCase().trim() : identifier.trim();

        // ── Fetch account by email or phone ───────────────────
        const { data: account, error } = await supabase
            .from("accounts")
            .select("account_id, account_type, email, phone_number, password_hash, mpin_hash, is_active")
            .eq(lookupField, lookupValue)
            .maybeSingle();

        if (error) throw error;

        if (!account) {
            return res.status(401).json({ success: false, message: "Invalid credentials." });
        }

        if (!account.is_active) {
            return res.status(403).json({
                success: false,
                message: "Your account has been deactivated. Please contact support.",
            });
        }

        // ── Detect credential type ────────────────────────────
        // A credential is treated as MPIN if it is exactly 6 numeric digits.
        // Otherwise it is treated as a password.
        const credentialStr = credential.toString().trim();
        const looksLikeMpin = /^\d{6}$/.test(credentialStr);

        let authenticated = false;

        if (looksLikeMpin && account.mpin_hash) {
            // Try MPIN
            authenticated = await bcrypt.compare(credentialStr, account.mpin_hash);
        }

        if (!authenticated) {
            // Try password (covers: non-MPIN credential, MPIN not set, or MPIN mismatch)
            if (!account.password_hash) {
                return res.status(401).json({ success: false, message: "Invalid credentials." });
            }
            authenticated = await bcrypt.compare(credentialStr, account.password_hash);
        }

        if (!authenticated) {
            return res.status(401).json({ success: false, message: "Invalid credentials." });
        }

        const token = generateAuthToken({
            account_id: account.account_id,
            account_type: account.account_type,
            email: account.email,
        });

        return res.status(200).json({
            success: true,
            message: "Signed in successfully.",
            token,
            account: {
                account_id: account.account_id,
                account_type: account.account_type,
                email: account.email,
                mpin_set: !!account.mpin_hash,
            },
        });
    } catch (err) {
        console.error("[signin]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};
// ─────────────────────────────────────────────────────────────
//  MPIN — Setup (first time)
//  POST /api/auth/mpin/setup
//  Headers: Authorization: Bearer <token>
//  Body: { password, mpin }
//
//  Requires the account password to confirm identity before
//  setting MPIN for the first time. Rejected if MPIN already set.
// ─────────────────────────────────────────────────────────────
const setupMpin = async (req, res) => {
    try {
        const { password, mpin } = req.body;
        const { account_id } = req.account; // injected by authenticate middleware

        if (!password || !mpin) {
            return res.status(400).json({
                success: false,
                message: "Password and MPIN are required.",
            });
        }

        if (mpin.toString().length !== 6 || isNaN(mpin)) {
            return res.status(400).json({
                success: false,
                message: "MPIN must be exactly 6 digits.",
            });
        }

        const { data: account, error } = await supabase
            .from("accounts")
            .select("password_hash, mpin_hash")
            .eq("account_id", account_id)
            .single();

        if (error) throw error;

        if (account.mpin_hash) {
            return res.status(409).json({
                success: false,
                message: "MPIN is already set up. Use the change-mpin endpoint to update it.",
            });
        }

        const passwordMatch = await bcrypt.compare(password, account.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Incorrect password.",
            });
        }

        const mpin_hash = await bcrypt.hash(mpin.toString(), SALT_ROUNDS);

        const { error: updateError } = await supabase
            .from("accounts")
            .update({ mpin_hash })
            .eq("account_id", account_id);

        if (updateError) throw updateError;

        return res.status(200).json({
            success: true,
            message: "MPIN set up successfully.",
        });
    } catch (err) {
        console.error("[setupMpin]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  MPIN — Change (already has MPIN)
//  POST /api/auth/mpin/change
//  Headers: Authorization: Bearer <token>
//  Body: { current_mpin, new_mpin }
//
//  Requires the current MPIN to authorize the change.
//  Rejected if MPIN has not been set up yet.
// ─────────────────────────────────────────────────────────────
const changeMpin = async (req, res) => {
    try {
        const { current_mpin, new_mpin } = req.body;
        const { account_id } = req.account;

        if (!current_mpin || !new_mpin) {
            return res.status(400).json({
                success: false,
                message: "current_mpin and new_mpin are required.",
            });
        }

        if (new_mpin.toString().length !== 6 || isNaN(new_mpin)) {
            return res.status(400).json({
                success: false,
                message: "New MPIN must be exactly 6 digits.",
            });
        }

        if (current_mpin.toString() === new_mpin.toString()) {
            return res.status(400).json({
                success: false,
                message: "New MPIN must be different from the current one.",
            });
        }

        const { data: account, error } = await supabase
            .from("accounts")
            .select("mpin_hash")
            .eq("account_id", account_id)
            .single();

        if (error) throw error;

        if (!account.mpin_hash) {
            return res.status(403).json({
                success: false,
                message: "MPIN has not been set up yet. Use the setup-mpin endpoint first.",
            });
        }

        const mpinMatch = await bcrypt.compare(current_mpin.toString(), account.mpin_hash);
        if (!mpinMatch) {
            return res.status(401).json({
                success: false,
                message: "Current MPIN is incorrect.",
            });
        }

        const new_mpin_hash = await bcrypt.hash(new_mpin.toString(), SALT_ROUNDS);

        const { error: updateError } = await supabase
            .from("accounts")
            .update({ mpin_hash: new_mpin_hash })
            .eq("account_id", account_id);

        if (updateError) throw updateError;

        return res.status(200).json({
            success: true,
            message: "MPIN changed successfully.",
        });
    } catch (err) {
        console.error("[changeMpin]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

module.exports = {
    checkAvailability,
    sendOTP,
    verifyOTP,
    completeSignup,
    signin,
    setupMpin,
    changeMpin,
};
