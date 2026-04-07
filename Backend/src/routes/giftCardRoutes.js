const express = require("express");
const {
    generateGiftCards,
    redeemGiftCard,
    listGiftCards,
    deactivateGiftCard,
} = require("../controllers/giftCardController");
const { authenticate, requireRole } = require("../middleware/authmiddleware");

const router = express.Router();

// ── Admin only ───────────────────────────────────────────────

// POST /api/gift-cards/generate  — bulk-generate gift cards
router.post(
    "/generate",
    authenticate,
    requireRole("admin"),
    generateGiftCards
);

// GET /api/gift-cards             — list all gift cards
router.get(
    "/",
    authenticate,
    requireRole("admin"),
    listGiftCards
);

// PATCH /api/gift-cards/:gift_card_id/deactivate  — disable a card
router.patch(
    "/:gift_card_id/deactivate",
    authenticate,
    requireRole("admin"),
    deactivateGiftCard
);

// ── Authenticated users ──────────────────────────────────────

// POST /api/gift-cards/redeem  — redeem a gift card code
router.post("/redeem", authenticate, redeemGiftCard);

module.exports = router;
