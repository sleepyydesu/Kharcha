const bcrypt = require("bcrypt");
const { verifyAuthToken } = require("../utils/jwtUtils");
const supabase = require("../services/supabaseClient");

/**
 * Middleware: authenticate via JWT Bearer token.
 * Attaches decoded token payload to req.account.
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "No token provided. Please sign in.",
        });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAuthToken(token);

    if (!decoded) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token. Please sign in again.",
        });
    }

    req.account = decoded; // { account_id, account_type, email }
    next();
};

/**
 * Middleware factory: restrict access to specific account types.
 *
 * Usage:
 *   router.get("/admin-only", authenticate, requireRole("admin"), handler);
 *   router.get("/users-and-orgs", authenticate, requireRole("user", "organization"), handler);
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.account || !roles.includes(req.account.account_type)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role: ${roles.join(" or ")}.`,
            });
        }
        next();
    };
};

/**
 * Internal helper: resolve and validate an X-API-Key header value.
 * Returns { apiKey } on success or { error } on failure.
 */
async function resolveApiKey(rawKey) {
    if (!rawKey || !rawKey.startsWith("kh_live_")) {
        return { error: "Invalid API key format." };
    }
    const keyPrefix = rawKey.slice(0, 12);
    const { data: candidates, error } = await supabase
        .from("api_keys")
        .select("api_key_id, account_id, key_hash, is_active, expires_at")
        .eq("key_prefix", keyPrefix)
        .eq("is_active", true);

    if (error || !candidates || candidates.length === 0) {
        return { error: "Invalid or revoked API key." };
    }

    let matched = null;
    for (const candidate of candidates) {
        const ok = await bcrypt.compare(rawKey, candidate.key_hash);
        if (ok) { matched = candidate; break; }
    }
    if (!matched) return { error: "Invalid API key." };
    if (matched.expires_at && new Date(matched.expires_at) < new Date()) {
        return { error: "API key has expired." };
    }

    // Fire-and-forget last_used_at update
    supabase
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("api_key_id", matched.api_key_id)
        .then(() => {});

    return { apiKey: matched };
}

/**
 * Middleware: authenticate via X-API-Key header (POS terminals, org integrations).
 * Attaches the resolved key record to req.apiKey.
 *
 * Usage:
 *   router.get("/pos/lookup/:rfid_uid", authenticateApiKey, handler);
 */
const authenticateApiKey = async (req, res, next) => {
    const rawKey = req.headers["x-api-key"];
    if (!rawKey) {
        return res.status(401).json({
            success: false,
            message: "No API key provided. Include X-API-Key header.",
        });
    }

    const { apiKey, error } = await resolveApiKey(rawKey);
    if (error) {
        return res.status(401).json({ success: false, message: error });
    }

    req.apiKey = apiKey; // { api_key_id, account_id, ... }
    next();
};

/**
 * Middleware: accept EITHER a JWT Bearer token OR an X-API-Key header.
 * If JWT is present, sets req.account (same shape as authenticate).
 * If X-API-Key is present, sets req.apiKey AND a synthetic req.account
 *   with just account_id so downstream controllers can use either.
 *
 * Used by endpoints that serve both the Kharcha dashboard (JWT) and
 * automated POS/server integrations (API key) — e.g. dynamic QR
 * payment sessions.
 */
const flexAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const rawKey     = req.headers["x-api-key"];

    // Prefer JWT when present
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token   = authHeader.split(" ")[1];
        const decoded = verifyAuthToken(token);
        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token. Please sign in again.",
            });
        }
        req.account = decoded;
        return next();
    }

    // Fall back to API key
    if (rawKey) {
        const { apiKey, error } = await resolveApiKey(rawKey);
        if (error) {
            return res.status(401).json({ success: false, message: error });
        }
        req.apiKey  = apiKey;
        // Provide a minimal req.account so controllers can use account_id uniformly
        req.account = { account_id: apiKey.account_id, account_type: "organization" };
        return next();
    }

    return res.status(401).json({
        success: false,
        message: "Authentication required. Provide a Bearer token or X-API-Key header.",
    });
};

module.exports = { authenticate, requireRole, authenticateApiKey, flexAuth };