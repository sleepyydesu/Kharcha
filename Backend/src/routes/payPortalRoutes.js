const express   = require("express");
const rateLimit = require("express-rate-limit");
const { verifyApiKey } = require("../middleware/apiKeyMiddleware");
const {
    createPortalSession,
    getPortalSession,
    loginAndSendOTP,
    verifyOTPAndPay,
    resendPortalOTP,
} = require("../controllers/payPortalController");

const router = express.Router();

const authLimit = rateLimit({
    windowMs: 60 * 1000, max: 5,
    message: { success: false, message: "Too many login attempts. Please wait." },
    standardHeaders: true, legacyHeaders: false,
});

const otpLimit = rateLimit({
    windowMs: 60 * 1000, max: 8,
    message: { success: false, message: "Too many OTP attempts. Please wait." },
    standardHeaders: true, legacyHeaders: false,
});

// Merchant: create session (API key required)
router.post("/sessions/create", verifyApiKey, createPortalSession);

// Payer portal flow
router.get( "/:session_id/session",    getPortalSession);
router.post("/:session_id/login",      authLimit, loginAndSendOTP);
router.post("/:session_id/verify-otp", otpLimit,  verifyOTPAndPay);
router.post("/:session_id/resend-otp", otpLimit,  resendPortalOTP);

module.exports = router;
