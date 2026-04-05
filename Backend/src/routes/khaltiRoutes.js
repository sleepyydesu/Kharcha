const express = require("express");
const router = express.Router();
const {
<<<<<<< HEAD
  initiateKhaltiPayment,
  verifyKhaltiPayment,
} = require("../controllers/khaltiController");

// POST /api/khalti/initiate → user clicks "Add Money"
router.post("/initiate", initiateKhaltiPayment);

// GET /api/khalti/verify → Khalti redirects back after payment
router.get("/verify", verifyKhaltiPayment);

module.exports = router;
=======
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
>>>>>>> f531e3a8ff24f510dd1cf8ebbaa5b83a13e7a1b8
