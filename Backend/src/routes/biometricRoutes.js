const express = require("express");
const { registerBiometric, verifyBiometric, verifyTransactionBiometric, deleteCredential } = require("../controllers/biometricController");
const { authenticate } = require("../middleware/authmiddleware");

const router = express.Router();

// Register a new biometric credential — user must already be logged in
router.post("/register", authenticate, registerBiometric);

// Verify a biometric assertion and issue session cookies — no prior auth needed
router.post("/verify", verifyBiometric);

// Verify biometric for a single transaction — returns a short-lived biometric_token
// The transfer endpoint accepts this in place of an MPIN
router.post("/verify-transaction", authenticate, verifyTransactionBiometric);

// Delete a biometric credential — user must be authenticated and can only delete their own credentials
router.delete("/credential", authenticate, deleteCredential);

module.exports = router;
