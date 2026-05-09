const express = require("express");
const {
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
    verifyMpin,
    forgotPasswordSendOTP,
    resetPassword,
    forgotMpinSendOTP,
    resetMpin,
} = require("../controllers/authController");
const { authenticate } = require("../middleware/authmiddleware");
const { otpRateLimiter } = require("../middleware/securityMiddleware");

const router = express.Router();

// ── Signup (multi-step) ─────────────────────────────────────
router.post("/signup/check", checkAvailability);
// otpRateLimiter keys by email — prevents one address from flooding OTP sends
// regardless of how many users share the same IP.
router.post("/signup/send-otp",    otpRateLimiter, sendOTP);
router.post("/signup/verify-otp",  verifyOTP);
router.post("/signup/complete",    completeSignup);

// ── Signin ──────────────────────────────────────────────────
router.post("/signin", signin);

// ── Session management ───────────────────────────────────────
// Reads the kharcha_refresh httpOnly cookie — no body needed.
// Returns a new access cookie + rotated refresh cookie.
router.post("/refresh",      refresh);
// Revokes this session's refresh token and clears both cookies.
router.post("/signout",      signout);
// Revokes ALL sessions for this account (sign out everywhere).
router.post("/signout-all",  authenticate, signoutAll);

// ── MPIN (protected — requires auth token) ──────────────────
router.get( "/mpin/status",  authenticate, getMpinStatus);
router.post("/mpin/setup",   authenticate, setupMpin);
router.post("/mpin/change",  authenticate, changeMpin);
router.post("/mpin/verify",  authenticate, verifyMpin);

// ── Forgot Password (no auth needed) ────────────────────────
// Step 1 — send OTP to email (otpRateLimiter: keyed by email, max 5 / 10 min)
router.post("/password/forgot-send-otp", otpRateLimiter, forgotPasswordSendOTP);
// Step 2 — verify OTP and set new password
router.post("/password/reset",           resetPassword);

// ── Forgot MPIN (no auth needed) ────────────────────────────
// Step 1 — send OTP to email
router.post("/mpin/forgot-send-otp", otpRateLimiter, forgotMpinSendOTP);
// Step 2 — verify OTP and set new MPIN
router.post("/mpin/reset",           resetMpin);

module.exports = router;