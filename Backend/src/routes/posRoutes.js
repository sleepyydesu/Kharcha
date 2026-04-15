const express = require("express");
const { posCharge, createCheckout, resolveCheckout, payCheckout, checkoutStatus } = require("../controllers/posController");
const { authenticate } = require("../middleware/authmiddleware");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const posRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { success: false, message: "Too many requests. Please wait." },
    standardHeaders: true,
    legacyHeaders: false,
});

// Existing RFID card tap charge
router.post("/charge", posRateLimiter, posCharge);

// ── QR Checkout sessions ──────────────────────────────────────
// POST   /api/pos/checkout              — store creates a session (X-API-Key)
// GET    /api/pos/checkout/:id          — Kharcha scanner resolves it (public)
// POST   /api/pos/checkout/:id/pay      — Kharcha user pays (JWT)
// GET    /api/pos/checkout/:id/status   — store polls for payment (X-API-Key)
router.post("/checkout",                posRateLimiter, createCheckout);
router.get( "/checkout/:session_id",               resolveCheckout);
router.post("/checkout/:session_id/pay", authenticate, payCheckout);
router.get( "/checkout/:session_id/status",        checkoutStatus);

module.exports = router;
