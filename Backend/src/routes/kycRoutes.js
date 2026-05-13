// Backend/src/routes/kycRoutes.js
'use strict';

const express = require('express');
const multer  = require('multer');
const { authenticate } = require('../middleware/authmiddleware');
const { requireAdmin }  = require('../middleware/authmiddleware'); // assumes you have this — see note below
const {
  getKycStatus,
  submitKyc,
  adminListSubmissions,
  adminGetSubmission,
  adminApproveSubmission,
  adminRejectSubmission,
} = require('../controllers/kycController');

const router = express.Router();

// ── Multer: memory storage, 5 MB limit per file ──────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter(_req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are accepted'));
    }
  },
});

const docUpload = upload.fields([
  { name: 'doc_front', maxCount: 1 },
  { name: 'doc_back',  maxCount: 1 },
]);

// ── User routes ───────────────────────────────────────────────────────────────

// GET  /api/kyc/status   — get own KYC status + latest submission info
router.get('/status', authenticate, getKycStatus);

// POST /api/kyc/submit   — submit KYC with document images
router.post('/submit', authenticate, docUpload, submitKyc);

// ── Admin routes ──────────────────────────────────────────────────────────────
// NOTE: requireAdmin should check req.user.role === 'admin' or similar.
// If your authmiddleware doesn't export requireAdmin yet, see the note at the
// bottom of this file for a simple inline version.

// GET  /api/kyc/admin/submissions           — list by status (pending/verified/rejected)
router.get('/admin/submissions', authenticate, requireAdmin, adminListSubmissions);

// GET  /api/kyc/admin/submissions/:id       — full detail + signed image URLs
router.get('/admin/submissions/:submission_id', authenticate, requireAdmin, adminGetSubmission);

// POST /api/kyc/admin/submissions/:id/approve
router.post('/admin/submissions/:submission_id/approve', authenticate, requireAdmin, adminApproveSubmission);

// POST /api/kyc/admin/submissions/:id/reject   body: { reason }
router.post('/admin/submissions/:submission_id/reject', authenticate, requireAdmin, adminRejectSubmission);

// ── Multer error handler ──────────────────────────────────────────────────────
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError || err.message?.includes('image')) {
    return res.status(400).json({ error: err.message });
  }
  return res.status(500).json({ error: 'Upload failed' });
});

module.exports = router;

/*
 * ── NOTE: requireAdmin ──────────────────────────────────────────────────────
 * If your authmiddleware.js doesn't already export a requireAdmin function,
 * add this to it:
 *
 *   function requireAdmin(req, res, next) {
 *     if (req.user?.role !== 'admin') {
 *       return res.status(403).json({ error: 'Admin access required' });
 *     }
 *     next();
 *   }
 *   module.exports = { ..., requireAdmin };
 *
 * Your adminController.js likely already has admin-role logic — align with
 * however you store the role (users.role column, or a separate admins table).
 * ────────────────────────────────────────────────────────────────────────────
 */