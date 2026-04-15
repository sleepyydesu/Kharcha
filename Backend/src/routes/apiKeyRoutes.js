const express = require("express");
const {
    createApiKey,
    listApiKeys,
    revokeApiKey,
    updateApiKey,
} = require("../controllers/apiKeyController");
const { authenticate } = require("../middleware/authmiddleware");

const router = express.Router();

router.use(authenticate);

// API key management (org accounts only)
router.post(  "/",              createApiKey);   // POST   /api/org/api-keys
router.get(   "/",              listApiKeys);    // GET    /api/org/api-keys
router.patch( "/:api_key_id",   updateApiKey);   // PATCH  /api/org/api-keys/:id
router.delete("/:api_key_id",   revokeApiKey);   // DELETE /api/org/api-keys/:id

module.exports = router;
