const bcrypt = require("bcrypt");
const supabase = require("../services/supabaseClient");
const { generateOTP } = require("../utils/otpUtils");
const { sendOTPEmail } = require("../utils/emailUtils");
const {
    generateSignupToken,
    verifySignupToken,
    generateAuthToken,
    generateRefreshToken,
    hashToken,
} = require("../utils/jwtUtils");
const {
    storeRefreshToken,
    findRefreshToken,
    rotateRefreshToken,
    revokeRefreshToken,
    revokeAllUserTokens,
} = require("../services/tokenService");
const { setAuthCookies, clearAuthCookies, REFRESH_COOKIE } = require("../utils/cookieUtils");
const { loginLockout, mpinLockout } = require("../middleware/securityMiddleware");

const SALT_ROUNDS = 10;
const OTP_EXPIRY_MINUTES = 15;
const VALID_ACCOUNT_TYPES = ["user", "organization", "admin"];
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_RULE_MESSAGE =
    "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.";

// ─────────────────────────────────────────────────────────────
//  Internal helper — issue access + refresh cookies and persist
//  the refresh token hash to the DB.
//  Call this at the end of signin and completeSignup.
// ─────────────────────────────────────────────────────────────
async function issueTokens(res, { account_id, account_type, email }) {
    const accessToken  = generateAuthToken({ account_id, account_type, email });
    const refreshToken = generateRefreshToken();
    const tokenHash    = hashToken(refreshToken);

    await storeRefreshToken(account_id, tokenHash);
    setAuthCookies(res, accessToken, refreshToken);
}

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

        await supabase
            .from("otp_verifications")
            .update({ is_used: true })
            .eq("email", normalizedEmail)
            .eq("otp_type", "signup")
            .eq("is_used", false);

        const { error: insertError } = await supabase
            .from("otp_verifications")
            .insert({ email: normalizedEmail, otp_code: otp, otp_type: "signup", expires_at: expiresAt });

        if (insertError) throw insertError;

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

        await supabase.from("otp_verifications").update({ is_used: true }).eq("id", data.id);

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
//  Body: { signup_token, account_type, password, phone_number?,
//          full_name | organization_name }
//  Sets httpOnly cookies on success — no token in response body.
// ─────────────────────────────────────────────────────────────
const completeSignup = async (req, res) => {
    try {
        const { signup_token, account_type, password, phone_number, full_name, organization_name } =
            req.body;

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

        const decoded = verifySignupToken(signup_token);
        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: "Signup session has expired or is invalid. Please start over.",
            });
        }

        const email = decoded.email;
        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        const { data: accountData, error: accountError } = await supabase
            .from("accounts")
            .insert({
                account_type,
                email,
                phone_number: phone_number ? phone_number.trim() : null,
                password_hash,
                mpin_hash: null,
                is_verified: account_type !== "user",
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

        if (account_type === "user") {
            const { error } = await supabase.from("users").insert({ account_id, full_name: full_name.trim() });
            if (error) throw error;
        } else if (account_type === "organization") {
            const { error } = await supabase.from("organizations").insert({ account_id, organization_name: organization_name.trim() });
            if (error) throw error;
        } else if (account_type === "admin") {
            const { error } = await supabase.from("admins").insert({ account_id, full_name: full_name.trim() });
            if (error) throw error;
        }

        const { error: walletError } = await supabase.from("wallets").insert({ account_id, balance: 0.0, currency: "NPR" });
        if (walletError) throw walletError;

        // ── Issue tokens as httpOnly cookies ──────────────────
        await issueTokens(res, { account_id, account_type, email });

        return res.status(201).json({
            success: true,
            message: "Account created successfully.",
            // token intentionally omitted — it lives in the cookie
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
//  Sets httpOnly cookies on success — no token in response body.
// ─────────────────────────────────────────────────────────────
const signin = async (req, res) => {
    try {
        const { identifier, credential } = req.body;

        if (!identifier || !credential) {
            return res.status(400).json({ success: false, message: "identifier and credential are required." });
        }

        const isEmail = identifier.includes("@");
        const lookupField = isEmail ? "email" : "phone_number";
        const lookupValue = isEmail ? identifier.toLowerCase().trim() : identifier.trim();

        // ── Lockout check ─────────────────────────────────────
        // Key by the normalised identifier so the lock is account-specific,
        // not IP-specific (users behind NAT won't affect each other).
        const lockoutKey = `signin:${lookupValue}`;
        const locked = loginLockout.check(lockoutKey);
        if (locked) {
            return res.status(423).json({
                success: false,
                message: `Account temporarily locked due to too many failed sign-in attempts. Please try again in ${Math.ceil(locked.retryAfterSeconds / 60)} minutes.`,
                retry_after_seconds: locked.retryAfterSeconds,
            });
        }

        const { data: account, error } = await supabase
            .from("accounts")
            .select("account_id, account_type, email, phone_number, password_hash, mpin_hash, is_active, is_verified")
            .eq(lookupField, lookupValue)
            .maybeSingle();

        if (error) throw error;

        // Deliberately vague — don't reveal whether the account exists.
        // Still record a failure to prevent enumeration via timing differences.
        if (!account) {
            loginLockout.failure(lockoutKey);
            return res.status(401).json({ success: false, message: "Invalid credentials." });
        }

        if (!account.is_active) {
            return res.status(403).json({
                success: false,
                message: "Your account has been deactivated. Please contact support.",
            });
        }

        const credentialStr = credential.toString().trim();
        const looksLikeMpin = /^\d{6}$/.test(credentialStr);

        let authenticated = false;

        if (looksLikeMpin && account.mpin_hash) {
            authenticated = await bcrypt.compare(credentialStr, account.mpin_hash);
        }

        if (!authenticated) {
            if (!account.password_hash) {
                const result = loginLockout.failure(lockoutKey);
                if (result.locked) {
                    return res.status(423).json({
                        success: false,
                        message: "Account locked due to too many failed sign-in attempts. Please try again in 15 minutes.",
                        retry_after_seconds: result.retryAfterSeconds,
                    });
                }
                return res.status(401).json({ success: false, message: "Invalid credentials." });
            }
            authenticated = await bcrypt.compare(credentialStr, account.password_hash);
        }

        if (!authenticated) {
            const result = loginLockout.failure(lockoutKey);
            if (result.locked) {
                return res.status(423).json({
                    success: false,
                    message: "Account locked due to too many failed sign-in attempts. Please try again in 15 minutes.",
                    retry_after_seconds: result.retryAfterSeconds,
                });
            }
            const remaining = result.failuresRemaining;
            return res.status(401).json({
                success: false,
                message: `Invalid credentials. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining before account is locked.`,
            });
        }

        // ── Success — clear failure counter ───────────────────
        loginLockout.success(lockoutKey);

        // ── Issue tokens as httpOnly cookies ──────────────────
        await issueTokens(res, {
            account_id: account.account_id,
            account_type: account.account_type,
            email: account.email,
        });

        return res.status(200).json({
            success: true,
            message: "Signed in successfully.",
            // token intentionally omitted — it lives in the cookie
            account: {
                account_id:   account.account_id,
                account_type: account.account_type,
                email:        account.email,
                mpin_set:     !!account.mpin_hash,
                is_verified:  account.is_verified,
            },
        });
    } catch (err) {
        console.error("[signin]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  REFRESH
//  POST /api/auth/refresh
//  No body — reads the kharcha_refresh httpOnly cookie.
//
//  Behaviour:
//    • Valid + recently active → new access cookie + rotated refresh cookie
//    • Expired / inactive / revoked → clears cookies + 401 (force re-login)
//
//  Token rotation: every successful refresh invalidates the old refresh
//  token and issues a brand-new one. If the same old token is presented
//  again it will be rejected (detects stolen tokens).
// ─────────────────────────────────────────────────────────────
const refresh = async (req, res) => {
    try {
        const rawRefreshToken = req.cookies?.[REFRESH_COOKIE];

        if (!rawRefreshToken) {
            return res.status(401).json({ success: false, message: "No refresh token. Please sign in." });
        }

        const tokenHash = hashToken(rawRefreshToken);
        const record    = await findRefreshToken(tokenHash);

        if (!record) {
            // Token is expired, revoked, or the session has been idle too long.
            clearAuthCookies(res);
            return res.status(401).json({
                success: false,
                message: "Session expired due to inactivity. Please sign in again.",
            });
        }

        // Fetch current account info (in case account_type changed, account disabled, etc.)
        const { data: account, error } = await supabase
            .from("accounts")
            .select("account_id, account_type, email, is_active")
            .eq("account_id", record.account_id)
            .single();

        if (error || !account || !account.is_active) {
            clearAuthCookies(res);
            return res.status(401).json({ success: false, message: "Account not found or deactivated." });
        }

        // Rotate: revoke old token, issue fresh one
        const newRawRefreshToken = generateRefreshToken();
        const newTokenHash       = hashToken(newRawRefreshToken);
        await rotateRefreshToken(record.id, account.account_id, newTokenHash);

        const newAccessToken = generateAuthToken({
            account_id:   account.account_id,
            account_type: account.account_type,
            email:        account.email,
        });

        setAuthCookies(res, newAccessToken, newRawRefreshToken);

        return res.status(200).json({ success: true, message: "Session refreshed." });
    } catch (err) {
        console.error("[refresh]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  SIGNOUT — current device
//  POST /api/auth/signout
//  Revokes this session's refresh token and clears cookies.
// ─────────────────────────────────────────────────────────────
const signout = async (req, res) => {
    try {
        const rawRefreshToken = req.cookies?.[REFRESH_COOKIE];
        if (rawRefreshToken) {
            await revokeRefreshToken(hashToken(rawRefreshToken));
        }
        clearAuthCookies(res);
        return res.status(200).json({ success: true, message: "Signed out successfully." });
    } catch (err) {
        console.error("[signout]", err);
        clearAuthCookies(res); // clear even if DB call failed
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  SIGNOUT ALL — every device
//  POST /api/auth/signout-all
//  Requires a valid access token (via authenticate middleware).
//  Revokes ALL refresh tokens for the account.
// ─────────────────────────────────────────────────────────────
const signoutAll = async (req, res) => {
    try {
        const { account_id } = req.account;
        await revokeAllUserTokens(account_id);
        clearAuthCookies(res);
        return res.status(200).json({ success: true, message: "Signed out from all devices." });
    } catch (err) {
        console.error("[signoutAll]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  MPIN endpoints (unchanged logic, no cookie changes needed)
// ─────────────────────────────────────────────────────────────
const setupMpin = async (req, res) => {
    try {
        const { password, mpin } = req.body;
        const { account_id } = req.account;

        if (!password || !mpin) {
            return res.status(400).json({ success: false, message: "Password and MPIN are required." });
        }

        if (mpin.toString().length !== 6 || isNaN(mpin)) {
            return res.status(400).json({ success: false, message: "MPIN must be exactly 6 digits." });
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
            return res.status(401).json({ success: false, message: "Incorrect password." });
        }

        const mpin_hash = await bcrypt.hash(mpin.toString(), SALT_ROUNDS);
        const { error: updateError } = await supabase
            .from("accounts")
            .update({ mpin_hash })
            .eq("account_id", account_id);

        if (updateError) throw updateError;

        return res.status(200).json({ success: true, message: "MPIN set up successfully." });
    } catch (err) {
        console.error("[setupMpin]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

const getMpinStatus = async (req, res) => {
    try {
        const { account_id } = req.account;

        const { data: account, error } = await supabase
            .from("accounts")
            .select("mpin_hash")
            .eq("account_id", account_id)
            .single();

        if (error || !account) {
            return res.status(404).json({ success: false, message: "Account not found." });
        }

        return res.status(200).json({ success: true, mpin_set: !!account.mpin_hash });
    } catch (err) {
        console.error("[getMpinStatus]", err);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

const changeMpin = async (req, res) => {
    try {
        const { current_mpin, new_mpin } = req.body;
        const { account_id } = req.account;

        if (!current_mpin || !new_mpin) {
            return res.status(400).json({ success: false, message: "current_mpin and new_mpin are required." });
        }

        if (new_mpin.toString().length !== 6 || isNaN(new_mpin)) {
            return res.status(400).json({ success: false, message: "New MPIN must be exactly 6 digits." });
        }

        if (current_mpin.toString() === new_mpin.toString()) {
            return res.status(400).json({ success: false, message: "New MPIN must be different from the current one." });
        }

        // ── Lockout check ─────────────────────────────────────
        const lockoutKey = `mpin:${account_id}`;
        const locked = mpinLockout.check(lockoutKey);
        if (locked) {
            return res.status(423).json({
                success: false,
                message: `MPIN locked due to too many incorrect attempts. Please try again in ${Math.ceil(locked.retryAfterSeconds / 60)} minutes.`,
                retry_after_seconds: locked.retryAfterSeconds,
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
            const result = mpinLockout.failure(lockoutKey);
            if (result.locked) {
                return res.status(423).json({
                    success: false,
                    message: "MPIN locked due to too many incorrect attempts. Please try again in 15 minutes.",
                    retry_after_seconds: result.retryAfterSeconds,
                });
            }
            const remaining = result.failuresRemaining;
            return res.status(401).json({
                success: false,
                message: `Current MPIN is incorrect. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining before MPIN is locked.`,
            });
        }

        mpinLockout.success(lockoutKey);

        const new_mpin_hash = await bcrypt.hash(new_mpin.toString(), SALT_ROUNDS);
        const { error: updateError } = await supabase
            .from("accounts")
            .update({ mpin_hash: new_mpin_hash })
            .eq("account_id", account_id);

        if (updateError) throw updateError;

        return res.status(200).json({ success: true, message: "MPIN changed successfully." });
    } catch (err) {
        console.error("[changeMpin]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

const forgotPasswordSendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: "Email is required." });

        const normalizedEmail = email.toLowerCase().trim();
        const { data: account } = await supabase
            .from("accounts")
            .select("account_id")
            .eq("email", normalizedEmail)
            .maybeSingle();

        if (account) {
            const otp = generateOTP();
            const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

            await supabase.from("otp_verifications").update({ is_used: true })
                .eq("email", normalizedEmail).eq("otp_type", "password_reset").eq("is_used", false);

            await supabase.from("otp_verifications").insert({
                email: normalizedEmail, otp_code: otp, otp_type: "password_reset", expires_at: expiresAt,
            });

            await sendOTPEmail(normalizedEmail, otp, "password_reset");
        }

        return res.status(200).json({
            success: true,
            message: `If an account exists for ${normalizedEmail}, a reset code has been sent. Valid for ${OTP_EXPIRY_MINUTES} minutes.`,
        });
    } catch (err) {
        console.error("[forgotPasswordSendOTP]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { email, otp, new_password } = req.body;

        if (!email || !otp || !new_password) {
            return res.status(400).json({ success: false, message: "email, otp, and new_password are required." });
        }
        if (!PASSWORD_REGEX.test(new_password)) {
            return res.status(400).json({ success: false, message: PASSWORD_RULE_MESSAGE });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const { data: otpRecord, error: otpError } = await supabase
            .from("otp_verifications")
            .select("*")
            .eq("email", normalizedEmail)
            .eq("otp_code", otp.toString().trim())
            .eq("otp_type", "password_reset")
            .eq("is_used", false)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (otpError) throw otpError;

        if (!otpRecord || new Date(otpRecord.expires_at) < new Date()) {
            return res.status(400).json({ success: false, message: "Invalid or expired reset code." });
        }

        await supabase.from("otp_verifications").update({ is_used: true }).eq("id", otpRecord.id);

        // Fetch current password hash to prevent reuse of the same password
        const { data: currentAcct, error: fetchError } = await supabase
            .from("accounts")
            .select("account_id, password_hash")
            .eq("email", normalizedEmail)
            .single();

        if (fetchError) throw fetchError;

        if (currentAcct?.password_hash) {
            const isSamePassword = await bcrypt.compare(new_password, currentAcct.password_hash);
            if (isSamePassword) {
                return res.status(400).json({
                    success: false,
                    message: "New password must be different from your current password.",
                });
            }
        }

        const password_hash = await bcrypt.hash(new_password, SALT_ROUNDS);
        const { error: updateError } = await supabase
            .from("accounts")
            .update({ password_hash, updated_at: new Date().toISOString() })
            .eq("email", normalizedEmail);

        if (updateError) throw updateError;

        // Revoke all sessions since password changed
        const { data: acct } = await supabase
            .from("accounts").select("account_id").eq("email", normalizedEmail).single();
        if (acct) await revokeAllUserTokens(acct.account_id);

        return res.status(200).json({
            success: true,
            message: "Password reset successfully. Please sign in with your new password.",
        });
    } catch (err) {
        console.error("[resetPassword]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

const forgotMpinSendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: "Email is required." });

        const normalizedEmail = email.toLowerCase().trim();
        const { data: account } = await supabase
            .from("accounts").select("account_id").eq("email", normalizedEmail).maybeSingle();

        if (account) {
            const otp = generateOTP();
            const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

            await supabase.from("otp_verifications").update({ is_used: true })
                .eq("email", normalizedEmail).eq("otp_type", "mpin_reset").eq("is_used", false);

            await supabase.from("otp_verifications").insert({
                email: normalizedEmail, otp_code: otp, otp_type: "mpin_reset", expires_at: expiresAt,
            });

            await sendOTPEmail(normalizedEmail, otp, "mpin_reset");
        }

        return res.status(200).json({
            success: true,
            message: `If an account exists for ${normalizedEmail}, an MPIN reset code has been sent. Valid for ${OTP_EXPIRY_MINUTES} minutes.`,
        });
    } catch (err) {
        console.error("[forgotMpinSendOTP]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

const resetMpin = async (req, res) => {
    try {
        const { email, otp, new_mpin } = req.body;

        if (!email || !otp || !new_mpin) {
            return res.status(400).json({ success: false, message: "email, otp, and new_mpin are required." });
        }
        if (new_mpin.toString().length !== 6 || isNaN(new_mpin)) {
            return res.status(400).json({ success: false, message: "MPIN must be exactly 6 digits." });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const { data: otpRecord, error: otpError } = await supabase
            .from("otp_verifications")
            .select("*")
            .eq("email", normalizedEmail)
            .eq("otp_code", otp.toString().trim())
            .eq("otp_type", "mpin_reset")
            .eq("is_used", false)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (otpError) throw otpError;

        if (!otpRecord || new Date(otpRecord.expires_at) < new Date()) {
            return res.status(400).json({ success: false, message: "Invalid or expired reset code." });
        }

        await supabase.from("otp_verifications").update({ is_used: true }).eq("id", otpRecord.id);

        const mpin_hash = await bcrypt.hash(new_mpin.toString(), SALT_ROUNDS);
        const { error: updateError } = await supabase
            .from("accounts")
            .update({ mpin_hash, updated_at: new Date().toISOString() })
            .eq("email", normalizedEmail);

        if (updateError) throw updateError;

        return res.status(200).json({ success: true, message: "MPIN reset successfully." });
    } catch (err) {
        console.error("[resetMpin]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

// ── Verify MPIN (lightweight check, no change) ────────────────
// POST /api/auth/mpin/verify
// Used before sensitive setup flows (e.g. biometric transaction enrollment).
const verifyMpin = async (req, res) => {
    try {
        const { account_id } = req.account;
        const { mpin } = req.body;

        if (!mpin) {
            return res.status(400).json({ success: false, message: "mpin is required." });
        }

        // ── Lockout check ─────────────────────────────────────
        const lockoutKey = `mpin:${account_id}`;
        const locked = mpinLockout.check(lockoutKey);
        if (locked) {
            return res.status(423).json({
                success: false,
                message: `MPIN locked due to too many incorrect attempts. Please try again in ${Math.ceil(locked.retryAfterSeconds / 60)} minutes.`,
                retry_after_seconds: locked.retryAfterSeconds,
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
                message: "No MPIN set up on this account.",
            });
        }

        const valid = await bcrypt.compare(mpin.toString(), account.mpin_hash);
        if (!valid) {
            const result = mpinLockout.failure(lockoutKey);
            if (result.locked) {
                return res.status(423).json({
                    success: false,
                    message: "MPIN locked due to too many incorrect attempts. Please try again in 15 minutes.",
                    retry_after_seconds: result.retryAfterSeconds,
                });
            }
            const remaining = result.failuresRemaining;
            return res.status(401).json({
                success: false,
                message: `Incorrect MPIN. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining before MPIN is locked.`,
            });
        }

        mpinLockout.success(lockoutKey);
        return res.status(200).json({ success: true, message: "MPIN verified." });
    } catch (err) {
        console.error("[verifyMpin]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

module.exports = {
    checkAvailability,
    sendOTP,
    verifyOTP,
    completeSignup,
    signin,
    refresh,
    signout,
    signoutAll,
    setupMpin,
    getMpinStatus,
    changeMpin,
    forgotPasswordSendOTP,
    resetPassword,
    forgotMpinSendOTP,
    resetMpin,
    issueTokens,
    verifyMpin,
};