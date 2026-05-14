const bcrypt = require("bcrypt");
const { verifyAuthToken } = require("../utils/jwtUtils");
const { ACCESS_COOKIE } = require("../utils/cookieUtils");
const supabase = require("../services/supabaseClient");

/**
 * Middleware: authenticate via the kharcha_access httpOnly cookie.
 * Falls back to Authorization: Bearer <token> so Swagger / API tools still work.
 * Attaches decoded token payload to req.account.
 */
const authenticate = (req, res, next) => {
    // 1. Prefer the httpOnly cookie (browser clients)
    let token = req.cookies?.[ACCESS_COOKIE];

    // 2. Fall back to Authorization header (Swagger / mobile / API clients)
    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        }
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "No token provided. Please sign in.",
        });
    }

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

    req.apiKey = apiKey;
    next();
};

/**
 * Middleware: accept EITHER a JWT cookie/Bearer token OR an X-API-Key header.
 * Used by endpoints that serve both the Kharcha dashboard and POS integrations.
 */
const flexAuth = async (req, res, next) => {
    // Check cookie first, then Authorization header
    let token = req.cookies?.[ACCESS_COOKIE];
    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        }
    }

    if (token) {
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
    const rawKey = req.headers["x-api-key"];
    if (rawKey) {
        const { apiKey, error } = await resolveApiKey(rawKey);
        if (error) {
            return res.status(401).json({ success: false, message: error });
        }
        req.apiKey  = apiKey;
        req.account = { account_id: apiKey.account_id, account_type: "organization" };
        return next();
    }

    return res.status(401).json({
        success: false,
        message: "Authentication required. Provide a cookie session, Bearer token, or X-API-Key header.",
    });
};

module.exports = { authenticate, requireRole, authenticateApiKey, flexAuth };
