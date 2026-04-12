const express = require("express");
const {
    createQRCode,
    listQRCodes,
    updateQRCode,
    deleteQRCode,
    resolveQRCode,
    createPaymentSession,
    completePayment,
    getPaymentSessionStatus,
} = require("../controllers/qrCodeController");
const { authenticate } = require("../middleware/authmiddleware");

// ── Public router (/api/qr-codes) ───────────────────────────
// IMPORTANT: this must be a SEPARATE router from orgRouter below.
// Mounting the same router at two different paths in app.js causes
// the public GET /:qr_id route (no auth) to shadow the authenticated
// org management routes when both share one router instance.
const publicRouter = express.Router();

// GET /api/qr-codes/:qr_id  — scanner resolves any QR type (no auth)
publicRouter.get("/:qr_id", resolveQRCode);

// ── Org-authenticated router (/api/org/qr-codes) ─────────────
const orgRouter = express.Router();

// All org routes require a valid JWT
orgRouter.use(authenticate);

// POST   /api/org/qr-codes           — create a named dynamic QR
// GET    /api/org/qr-codes           — list all org QR codes
// PATCH  /api/org/qr-codes/:qr_id   — update name/amount/note/callback
// DELETE /api/org/qr-codes/:qr_id   — delete
orgRouter.post("/", createQRCode);
orgRouter.get("/", listQRCodes);
orgRouter.patch("/:qr_id", updateQRCode);
orgRouter.delete("/:qr_id", deleteQRCode);

// Payment session endpoints (POS creates a per-transaction QR)
orgRouter.post("/payments/create", createPaymentSession);
orgRouter.post("/payments/complete", completePayment);
// GET /api/org/qr-codes/payments/status/:session_id — merchant polls after showing QR
orgRouter.get("/payments/status/:session_id", getPaymentSessionStatus);

module.exports = { publicRouter, orgRouter };
