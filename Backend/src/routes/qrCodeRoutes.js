const express = require("express");
const {
    createQRCode,
    listQRCodes,
    updateQRCode,
    deleteQRCode,
    resolveQRCode,
    createPaymentSession,
    completePayment
} = require("../controllers/qrCodeController");
const { authenticate } = require("../middleware/authmiddleware");

const router = express.Router();

// ── Public — no auth ────────────────────────────────────────
// GET /api/qr-codes/:qr_id  — resolve a dynamic QR (called by scanner)
router.get("/:qr_id", resolveQRCode);

// ── Org-authenticated — requires JWT ─────────────────────────
// POST   /api/org/qr-codes        — create
// GET    /api/org/qr-codes        — list
// PATCH  /api/org/qr-codes/:qr_id — update (name, amount, note, callback_url, etc.)
// DELETE /api/org/qr-codes/:qr_id — delete
router.post(  "/",         authenticate, createQRCode);
router.get(   "/",         authenticate, listQRCodes);
router.patch( "/:qr_id",  authenticate, updateQRCode);
router.delete("/:qr_id",  authenticate, deleteQRCode);
router.post("/payments/create", createPaymentSession);
router.post("/payments/complete", completePayment);

module.exports = router;
