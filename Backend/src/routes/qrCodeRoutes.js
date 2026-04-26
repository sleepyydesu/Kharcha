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
const { authenticate, flexAuth } = require("../middleware/authmiddleware");

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

// QR code management — dashboard operations, JWT only
// POST   /api/org/qr-codes           — create a named dynamic QR
// GET    /api/org/qr-codes           — list all org QR codes
// PATCH  /api/org/qr-codes/:qr_id   — update name/amount/note/callback
// DELETE /api/org/qr-codes/:qr_id   — delete
orgRouter.post("/",           authenticate, createQRCode);
orgRouter.get("/",            authenticate, listQRCodes);
orgRouter.patch("/:qr_id",    authenticate, updateQRCode);
orgRouter.delete("/:qr_id",   authenticate, deleteQRCode);

// Payment session endpoints — support JWT (org dashboard) OR API key (POS/server)
// POST /api/org/qr-codes/payments/create  — merchant creates a per-transaction QR session
// POST /api/org/qr-codes/payments/complete — user pays (still JWT — called by Kharcha app)
// GET  /api/org/qr-codes/payments/status/:session_id — merchant polls for payment result
orgRouter.post("/payments/create",                    flexAuth, createPaymentSession);
orgRouter.post("/payments/complete",                  authenticate, completePayment);
orgRouter.get("/payments/status/:session_id",         flexAuth, getPaymentSessionStatus);

module.exports = { publicRouter, orgRouter };