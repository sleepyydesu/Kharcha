const express = require("express");
const {
    getWallet,
    transfer,
    lookupReceiver,
} = require("../controllers/walletController");
const { authenticate } = require("../middleware/authmiddleware");
const { transferRateLimiter } = require("../middleware/securityMiddleware");

const router = express.Router();

// All wallet routes require authentication
router.use(authenticate);

// GET  /api/wallet          — current wallet balance & info
router.get("/", getWallet);

// GET  /api/wallet/lookup   — preview receiver before transfer (?identifier=phone_or_uuid)
router.get("/lookup", lookupReceiver);

// POST /api/wallet/transfer — send money (used for ALL in-app transactions)
router.post("/transfer", transferRateLimiter, transfer);

module.exports = router;
