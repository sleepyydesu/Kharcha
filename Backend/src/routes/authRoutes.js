const express = require("express");
const {
    checkAvailability,
    sendOTP,
    verifyOTP,
    completeSignup,
    signin,
    setupMpin,
    changeMpin,
    forgotPasswordSendOTP,
    resetPassword,
    forgotMpinSendOTP,
    resetMpin,
} = require("../controllers/authController");
const { authenticate } = require("../middleware/authmiddleware");

const router = express.Router();

// ── Signup (multi-step) ─────────────────────────────────────
router.post("/signup/check", checkAvailability);
router.post("/signup/send-otp", sendOTP);
router.post("/signup/verify-otp", verifyOTP);
router.post("/signup/complete", completeSignup);

// ── Signin ──────────────────────────────────────────────────
router.post("/signin", signin);

// ── MPIN (protected — requires auth token) ──────────────────
router.post("/mpin/setup", authenticate, setupMpin);
router.post("/mpin/change", authenticate, changeMpin);

<<<<<<< HEAD
=======
// ── Forgot Password (no auth needed) ────────────────────────
// Step 1 — send OTP to email
router.post("/password/forgot-send-otp", forgotPasswordSendOTP);
// Step 2 — verify OTP and set new password
router.post("/password/reset", resetPassword);

// ── Forgot MPIN (no auth needed) ────────────────────────────
// Step 1 — send OTP to email
router.post("/mpin/forgot-send-otp", forgotMpinSendOTP);
// Step 2 — verify OTP and set new MPIN
router.post("/mpin/reset", resetMpin);

>>>>>>> f531e3a8ff24f510dd1cf8ebbaa5b83a13e7a1b8
module.exports = router;
