const express = require("express");
const {
    createAdmin,
    submitVerificationRequest,
    listVerificationRequests,
    getVerificationRequest,
    reviewVerificationRequest,
} = require("../controllers/adminController");
const { authenticate, requireRole } = require("../middleware/authmiddleware");

const router = express.Router();

// ── Create Admin ─────────────────────────────────────────────
// Open if no admins exist + valid bootstrap_code; otherwise requires admin auth.
// We call authenticate optionally: if no token is provided we proceed as
// unauthenticated (bootstrap mode); the controller handles the logic.
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        return authenticate(req, res, next);
    }
    next(); // proceed without setting req.account
};

router.post("/create", optionalAuth, createAdmin);

// ── Verification (user submits) ───────────────────────────────
router.post(
    "/verification/request",
    authenticate,
    requireRole("user"),
    submitVerificationRequest
);

// ── Verification (admin reviews) ─────────────────────────────
router.get(
    "/verification/requests",
    authenticate,
    requireRole("admin"),
    listVerificationRequests
);

router.get(
    "/verification/requests/:request_id",
    authenticate,
    requireRole("admin"),
    getVerificationRequest
);

router.post(
    "/verification/requests/:request_id/review",
    authenticate,
    requireRole("admin"),
    reviewVerificationRequest
);

module.exports = router;
