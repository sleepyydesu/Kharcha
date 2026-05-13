// Backend/src/routes/kycRoutes.js
"use strict";

const express = require("express");
const multer = require("multer");
const { authenticate, requireRole } = require("../middleware/authmiddleware");
const {
  getKycStatus,
  submitKyc,
  adminListSubmissions,
  adminGetSubmission,
  adminApproveSubmission,
  adminRejectSubmission,
} = require("../controllers/kycController");

const router = express.Router();

// ── Multer: memory storage, 5 MB limit per file ──────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter(_req, file, cb) {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WebP images are accepted"));
    }
  },
});

const docUpload = upload.fields([
  { name: "doc_front", maxCount: 1 },
  { name: "doc_back", maxCount: 1 },
]);

// ── User routes ───────────────────────────────────────────────────────────────

// GET  /api/kyc/status   — get own KYC status + latest submission info
router.get("/status", authenticate, getKycStatus);

// POST /api/kyc/submit   — submit KYC with document images
router.post("/submit", authenticate, docUpload, submitKyc);

// ── Admin routes ─────────────────────────────────────────────────

// GET  /api/kyc/admin/submissions           — list by status (pending/verified/rejected)
router.get(
  "/admin/submissions",
  authenticate,
  requireRole("admin"),
  adminListSubmissions,
);

// GET  /api/kyc/admin/submissions/:id       — full detail + signed image URLs
router.get(
  "/admin/submissions/:submission_id",
  authenticate,
  requireRole("admin"),
  adminGetSubmission,
);

// POST /api/kyc/admin/submissions/:id/approve
router.post(
  "/admin/submissions/:submission_id/approve",
  authenticate,
  requireRole("admin"),
  adminApproveSubmission,
);

// POST /api/kyc/admin/submissions/:id/reject   body: { reason }
router.post(
  "/admin/submissions/:submission_id/reject",
  authenticate,
  requireRole("admin"),
  adminRejectSubmission,
);

// ── Multer error handler ──────────────────────────────────────────────────────
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError || err.message?.includes("image")) {
    return res.status(400).json({ error: err.message });
  }
  return res.status(500).json({ error: "Upload failed" });
});

module.exports = router;

/*
 * ── Admin Authorization ────────────────────────────────────────────────────
 *
 * This route file uses:
 *
 *   requireRole('admin')
 *
 * from authmiddleware.js to protect admin-only endpoints.
 *
 * The authenticate middleware attaches:
 *
 *   req.account = {
 *     account_id,
 *     account_type,
 *     email
 *   }
 *
 * requireRole checks:
 *
 *   req.account.account_type
 *
 * Example:
 *
 *   requireRole('admin')
 *
 * allows only accounts where:
 *
 *   account_type === 'admin'
 *
 * ───────────────────────────────────────────────────────────────────────────
 */
