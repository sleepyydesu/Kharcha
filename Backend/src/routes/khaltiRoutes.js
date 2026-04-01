const express = require("express");
const router = express.Router();
const {
  initiateKhaltiPayment,
  verifyKhaltiPayment,
} = require("../controllers/khaltiController");

// POST /api/khalti/initiate → user clicks "Add Money"
router.post("/initiate", initiateKhaltiPayment);

// GET /api/khalti/verify → Khalti redirects back after payment
router.get("/verify", verifyKhaltiPayment);

module.exports = router;
