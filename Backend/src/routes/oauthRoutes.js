/**
 * oauthRoutes.js
 *
 * Route map for the Kharcha Linked-Account OAuth API.
 *
 * Public endpoints (no auth):
 *   GET  /api/oauth/authorize              → validate client + show consent info
 *   POST /api/oauth/token                  → exchange auth code for link_token
 *   POST /api/oauth/pay/confirm            → confirm payment with OTP
 *
 * Third-party backend endpoints (X-Client-Id + X-Client-Secret headers):
 *   POST /api/oauth/pay/initiate           → initiate payment, send OTP
 *
 * User-authenticated endpoints (JWT cookie):
 *   POST /api/oauth/authorize/complete     → user confirms linking
 *   GET  /api/oauth/my-linked-apps         → list apps the user has linked
 *   DELETE /api/oauth/my-linked-apps/:id   → unlink an app
 *
 * Org-authenticated endpoints (X-API-Key header, organization account):
 *   POST   /api/oauth/clients              → register a new OAuth client
 *   GET    /api/oauth/clients              → list this org's clients
 *   DELETE /api/oauth/clients/:client_id   → revoke a client
 */

const express    = require("express");
const router     = express.Router();
const { authenticate } = require("../middleware/authmiddleware");
const { verifyApiKey }  = require("../middleware/apiKeyMiddleware");
const {
    registerClient,
    getAuthorizeInfo,
    completeAuthorization,
    exchangeToken,
    initiatePayment,
    createLinkedGroup,
    confirmPayment,
    listLinkedApps,
    revokeLinkedApp,
    listClients,
    revokeClient,
} = require("../controllers/oauthController");

// ── Public ────────────────────────────────────────────────────
// Validate client and return consent info (frontend calls this before showing
// the login/consent screen)
router.get("/authorize", getAuthorizeInfo);

// Third-party backend exchanges auth code for link_token
router.post("/token", exchangeToken);

// Third-party backend initiates payment (sends OTP to user)
router.post("/pay/initiate", initiatePayment);
router.post("/groups/create", createLinkedGroup);

// Third-party backend (or their frontend) confirms payment with OTP
router.post("/pay/confirm", confirmPayment);

// ── User-authenticated (JWT) ──────────────────────────────────
// User confirms linking on Kharcha's site → returns redirect URL with auth code
router.post("/authorize/complete", authenticate, completeAuthorization);

// User manages their linked apps
router.get("/my-linked-apps",                    authenticate, listLinkedApps);
router.delete("/my-linked-apps/:authorization_id", authenticate, revokeLinkedApp);

// ── Org-authenticated (X-API-Key, organization account) ───────
// Org registers and manages their OAuth clients
router.post("/clients",             verifyApiKey, registerClient);
router.get("/clients",              verifyApiKey, listClients);
router.delete("/clients/:client_id", verifyApiKey, revokeClient);

module.exports = router;
