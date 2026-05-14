/**
 * apiKeyMiddleware.js
 * Shared middleware for endpoints that require X-API-Key authentication.
 * Attaches req.apiKeyAccount (account_id) and req.apiKeyId on success.
 */

const bcrypt   = require("bcrypt");
const supabase = require("../services/supabaseClient");

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

    if (error || !candidates?.length) return { error: "Invalid or revoked API key." };

    let matched = null;
    for (const c of candidates) {
        if (await bcrypt.compare(rawKey, c.key_hash)) { matched = c; break; }
    }
    if (!matched) return { error: "Invalid API key." };
    if (matched.expires_at && new Date(matched.expires_at) < new Date()) {
        return { error: "API key has expired." };
    }

    // Non-blocking last_used_at update
    supabase
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("api_key_id", matched.api_key_id)
        .then(() => {});

    return { apiKey: matched };
}

async function verifyApiKey(req, res, next) {
    const rawKey = req.headers["x-api-key"];
    const { apiKey, error } = await resolveApiKey(rawKey);
    if (error) {
        return res.status(401).json({ success: false, message: error });
    }
    req.apiKeyAccount = apiKey.account_id;
    req.apiKeyId      = apiKey.api_key_id;
    next();
}

module.exports = { verifyApiKey, resolveApiKey };
