const express = require("express");
const { registerBiometric, verifyBiometric } = require("../controllers/biometricController");
const { authenticate } = require("../middleware/authmiddleware");

const router = express.Router();

// Register a new biometric credential — user must already be logged in
router.post("/register", authenticate, registerBiometric);

// Verify a biometric assertion and issue session cookies — no prior auth needed
router.post("/verify", verifyBiometric);

module.exports = router;
