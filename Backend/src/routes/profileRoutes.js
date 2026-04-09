const express = require("express");
const {
    getProfile,
    uploadProfilePicture,
    deleteProfilePicture,
    updateProfile,
    getOrgTypes,
} = require("../controllers/profileController");
const { authenticate } = require("../middleware/authmiddleware");

const router = express.Router();

// Public:
// GET /api/profile/org-types  — organization types (for registration / profile editing)
router.get("/org-types", getOrgTypes);

// All routes below require auth
router.use(authenticate);

// GET    /api/profile          — get full profile + wallet balance
router.get("/", getProfile);

// PATCH  /api/profile          — update name / org type / phone
router.patch("/", updateProfile);

// POST   /api/profile/picture  — upload profile picture (base64 body)
router.post("/picture", uploadProfilePicture);

// DELETE /api/profile/picture  — remove profile picture
router.delete("/picture", deleteProfilePicture);

module.exports = router;
