// ─── src/routes/cardRoutes.js ─────────────────────────────────
const express = require("express");
const {
    requestCard,
    getMyCard,
    blockMyCard,
    updateCardLimits,
    adminActivateCard,
    adminListRequests,
} = require("../controllers/cardController");
const { authenticate } = require("../middleware/authmiddleware");

const router = express.Router();

router.use(authenticate);

// User routes
router.post("/request",           requestCard);       // POST  /api/cards/request
router.get("/my-card",            getMyCard);          // GET   /api/cards/my-card
router.post("/my-card/block",     blockMyCard);        // POST  /api/cards/my-card/block
router.patch("/my-card/limits",   updateCardLimits);   // PATCH /api/cards/my-card/limits

// Admin routes
router.post("/admin/activate",    adminActivateCard);  // POST  /api/cards/admin/activate
router.get("/admin/requests",     adminListRequests);  // GET   /api/cards/admin/requests

module.exports = router;
