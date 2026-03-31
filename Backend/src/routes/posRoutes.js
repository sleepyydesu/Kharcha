// ─── src/routes/posRoutes.js ─────────────────────────────────
// POST /api/pos/charge — no JWT, uses X-API-Key header
const express = require("express");
const { posCharge } = require("../controllers/posController");
const rateLimit = require("express-rate-limit");

const router = express.Router();

// Strict rate limiting for POS endpoint — protect against brute-force card scanning
const posRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,             // 30 charges per minute per IP (adjust for your traffic)
    message: { success: false, message: "Too many requests from this terminal. Please wait." },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post("/charge", posRateLimiter, posCharge);

module.exports = router;
