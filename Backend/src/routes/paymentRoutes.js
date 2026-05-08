/**
 * paymentRoutes.js
 *
 * External payment API for third-party organizations.
 * Authentication: X-API-Key header (Kharcha org API key).
 *
 * POST /api/payment/charge   — verify card (number + CVV) and charge
 * POST /api/payment/verify   — verify card details only (no charge)
 */

const express    = require("express");
const rateLimit  = require("express-rate-limit");
const { chargeCard, verifyCard } = require("../controllers/paymentController");

const router = express.Router();

// Tight rate limit — 20 payment attempts per minute per IP
const paymentRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { success: false, error_code: "RATE_LIMITED", message: "Too many payment requests. Please slow down." },
    standardHeaders: true,
    legacyHeaders:   false,
});

// POST /api/payment/charge — charge a card (verify CVV + debit)
router.post("/charge", paymentRateLimiter, chargeCard);

// POST /api/payment/verify — pre-auth / verify card without charging
router.post("/verify", paymentRateLimiter, verifyCard);

module.exports = router;