const supabase = require("./supabaseClient");

// How long a session can be idle before the refresh token stops working.
// After INACTIVITY_WINDOW_MS of no API activity, the user must log in again.
const INACTIVITY_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

// Absolute lifetime of a refresh token regardless of activity.
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Persist a new refresh token record.
 * Call this on signin / signup.
 */
const storeRefreshToken = async (accountId, tokenHash) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS).toISOString();

    const { data, error } = await supabase
        .from("refresh_tokens")
        .insert({
            account_id: accountId,
            token_hash: tokenHash,
            expires_at: expiresAt,
            last_used_at: now.toISOString(),
        })
        .select("id")
        .single();

    if (error) throw error;
    return data;
};

/**
 * Look up a refresh token by its hash.
 *
 * Returns the DB record if — and only if — ALL of these hold:
 *   1. The hash exists and is not revoked
 *   2. The absolute expiry has not passed
 *   3. The token has been used within the inactivity window
 *
 * Returns null otherwise (caller should treat this as "please log in again").
 */
const findRefreshToken = async (tokenHash) => {
    const { data, error } = await supabase
        .from("refresh_tokens")
        .select("*")
        .eq("token_hash", tokenHash)
        .eq("is_revoked", false)
        .maybeSingle();

    if (error || !data) return null;

    // Check absolute expiry
    if (new Date(data.expires_at) < new Date()) return null;

    // Check inactivity window
    const lastUsed = new Date(data.last_used_at);
    if (Date.now() - lastUsed.getTime() > INACTIVITY_WINDOW_MS) return null;

    return data;
};

/**
 * Rotate a refresh token (token theft detection pattern):
 *   - Revoke the old token record
 *   - Insert a fresh token with a new hash + updated last_used_at
 *
 * Call this every time /auth/refresh succeeds.
 */
const rotateRefreshToken = async (oldId, accountId, newTokenHash) => {
    // Revoke the old token
    await supabase
        .from("refresh_tokens")
        .update({ is_revoked: true })
        .eq("id", oldId);

    // Store the replacement
    return storeRefreshToken(accountId, newTokenHash);
};

/**
 * Revoke a single refresh token (single-device sign-out).
 */
const revokeRefreshToken = async (tokenHash) => {
    await supabase
        .from("refresh_tokens")
        .update({ is_revoked: true })
        .eq("token_hash", tokenHash);
};

/**
 * Revoke ALL active refresh tokens for an account (sign-out everywhere).
 */
const revokeAllUserTokens = async (accountId) => {
    await supabase
        .from("refresh_tokens")
        .update({ is_revoked: true })
        .eq("account_id", accountId)
        .eq("is_revoked", false);
};

module.exports = {
    storeRefreshToken,
    findRefreshToken,
    rotateRefreshToken,
    revokeRefreshToken,
    revokeAllUserTokens,
    REFRESH_TOKEN_TTL_MS,
};
