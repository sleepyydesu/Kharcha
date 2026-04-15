const express = require("express");
const router = express.Router();
const {
    initiateKhaltiPayment,
    verifyKhaltiPayment,
} = require("../controllers/khaltiController");
const { authenticate } = require("../middleware/authmiddleware");

// POST /api/khalti/initiate
// User must be logged in — we read their account_id from the JWT.
// Body: { amount }
router.post("/initiate", authenticate, initiateKhaltiPayment);

// GET /api/khalti/verify?pidx=<token>
// No JWT — this is where Khalti redirects the user after payment.
// Khalti appends ?pidx=...&status=...&transaction_id=... to this URL.
router.get("/verify", verifyKhaltiPayment);

module.exports = router;