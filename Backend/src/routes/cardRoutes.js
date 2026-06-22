// ─── src/routes/cardRoutes.js ─────────────────────────────────
const express = require("express");
const {
    getMyCards,
    issueVirtualCard,
    requestPhysicalCard,
    blockCard,
    updateCardLimits,
    adminActivatePhysical,
    adminSetRFID,
    adminUpdateCardLimits,
    adminBlockCard,
    adminUnblockCard,
    adminListRequests,
    adminRejectRequest,
    posLookupByRFID,
} = require("../controllers/cardController");
const { authenticate, authenticateApiKey } = require("../middleware/authmiddleware");

const router = express.Router();

// ── User routes (JWT required) ─────────────────────────────────
// GET  /api/cards/my-cards                — fetch both virtual + physical cards
router.get("/my-cards",                    authenticate, getMyCards);

// POST /api/cards/virtual/issue           — issue virtual card instantly
router.post("/virtual/issue",              authenticate, issueVirtualCard);

// POST /api/cards/physical/request        — request a physical card (needs admin)
router.post("/physical/request",           authenticate, requestPhysicalCard);

// POST /api/cards/:card_type/block        — block virtual or physical card
router.post("/:card_type/block",           authenticate, blockCard);

// PATCH /api/cards/:card_type/limits      — update daily spend limit
router.patch("/:card_type/limits",         authenticate, updateCardLimits);

// ── Admin routes (JWT + admin role enforced in controller) ─────
// POST  /api/cards/admin/activate-physical — assign RFID UID + activate
router.post("/admin/activate-physical",    authenticate, adminActivatePhysical);

// PATCH /api/cards/admin/set-rfid          — update RFID UID on existing card
router.patch("/admin/set-rfid",            authenticate, adminSetRFID);

// PATCH /api/cards/admin/limits            — admin update daily limit on any card
router.patch("/admin/limits",              authenticate, adminUpdateCardLimits);

// POST  /api/cards/admin/block             — admin block any card
router.post("/admin/block",                authenticate, adminBlockCard);

// POST  /api/cards/admin/unblock           — admin unblock any card
router.post("/admin/unblock",              authenticate, adminUnblockCard);

// GET   /api/cards/admin/requests          — list physical card requests
router.get("/admin/requests",              authenticate, adminListRequests);
router.patch("/admin/requests/:request_id/reject", authenticate, adminRejectRequest);

// ── POS / RFID reader route (API key required — no JWT) ────────
// GET   /api/cards/pos/lookup/:rfid_uid    — look up account by RFID tap
// POS terminals authenticate with X-API-Key, not a user JWT.
router.get("/pos/lookup/:rfid_uid",        authenticateApiKey, posLookupByRFID);

module.exports = router;
