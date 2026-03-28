const express = require("express");
const {
    checkAvailability,
    sendOTP,
    verifyOTP,
    completeSignup,
    signin,
    setupMpin,
    changeMpin,
} = require("../controllers/authController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

// ── Signup (multi-step) ─────────────────────────────────────
// Step 1 — Check if email/phone is already registered
router.post("/signup/check", checkAvailability);

// Step 2 — Send OTP to email
router.post("/signup/send-otp", sendOTP);

// Step 3 — Verify OTP → receive signup_token
router.post("/signup/verify-otp", verifyOTP);

// Step 4 — Complete signup with all details + signup_token
router.post("/signup/complete", completeSignup);

// ── Signin ──────────────────────────────────────────────────
router.post("/signin", signin);

// ── MPIN (protected — requires auth token) ──────────────────
// First-time MPIN setup — verifies password before allowing
router.post("/mpin/setup", authenticate, setupMpin);

// Change existing MPIN — verifies current MPIN before allowing
router.post("/mpin/change", authenticate, changeMpin);

module.exports = router;