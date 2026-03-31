const bcrypt = require("bcrypt");
const crypto = require("crypto");
const supabase = require("../services/supabaseClient");

const SALT_ROUNDS = 10;
const KEY_PREFIX_VISIBLE = 12; // chars shown to the user for identification

// Generate a cryptographically random API key
// Format: kh_live_<48 random hex chars>
function generateRawKey() {
    const random = crypto.randomBytes(24).toString("hex"); // 48 hex chars
    return `kh_live_${random}`;
}

// ─────────────────────────────────────────────────────────────
//  CREATE API KEY
//  POST /api/org/api-keys
//  Body: { name? }
//  Only organization accounts can create API keys.
//  All POS terminals belonging to this org share this key.
// ─────────────────────────────────────────────────────────────
const createApiKey = async (req, res) => {
    try {
        const { account_id, account_type } = req.account;
        const { name } = req.body;

        if (account_type !== "organization") {
            return res.status(403).json({
                success: false,
                message: "Only organization accounts can create API keys.",
            });
        }

        // Limit: max 10 active keys per org
        const { count } = await supabase
            .from("api_keys")
            .select("*", { count: "exact", head: true })
            .eq("account_id", account_id)
            .eq("is_active", true);

        if (count >= 10) {
            return res.status(400).json({
                success: false,
                message: "Maximum of 10 active API keys per organization. Revoke an existing key first.",
            });
        }

        // Generate key and hash it
        const rawKey = generateRawKey();
        const keyHash = await bcrypt.hash(rawKey, SALT_ROUNDS);
        const keyPrefix = rawKey.slice(0, KEY_PREFIX_VISIBLE); // "kh_live_ab12"

        const { data: newKey, error } = await supabase
            .from("api_keys")
            .insert({
                account_id,
                key_hash: keyHash,
                key_prefix: keyPrefix,
                name: name || "API Key",
            })
            .select("api_key_id, key_prefix, name, is_active, created_at")
            .single();

        if (error) throw error;

        // Return the raw key ONCE — it is never stored in plain text again
        return res.status(201).json({
            success: true,
            message: "API key created. Copy it now — it will not be shown again.",
            api_key: rawKey,
            key_info: {
                api_key_id: newKey.api_key_id,
                key_prefix: newKey.key_prefix,
                name:       newKey.name,
                is_active:  newKey.is_active,
                created_at: newKey.created_at,
            },
        });
    } catch (err) {
        console.error("[createApiKey]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  LIST API KEYS
//  GET /api/org/api-keys
// ─────────────────────────────────────────────────────────────
const listApiKeys = async (req, res) => {
    try {
        const { account_id, account_type } = req.account;

        if (account_type !== "organization") {
            return res.status(403).json({ success: false, message: "Organization accounts only." });
        }

        const { data: keys, error } = await supabase
            .from("api_keys")
            .select("api_key_id, key_prefix, name, is_active, last_used_at, created_at, expires_at")
            .eq("account_id", account_id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return res.status(200).json({ success: true, api_keys: keys || [] });
    } catch (err) {
        console.error("[listApiKeys]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  REVOKE API KEY
//  DELETE /api/org/api-keys/:api_key_id
// ─────────────────────────────────────────────────────────────
const revokeApiKey = async (req, res) => {
    try {
        const { account_id, account_type } = req.account;
        const { api_key_id } = req.params;

        if (account_type !== "organization") {
            return res.status(403).json({ success: false, message: "Organization accounts only." });
        }

        // Ensure the key belongs to this org
        const { data: key, error: fetchError } = await supabase
            .from("api_keys")
            .select("api_key_id, is_active")
            .eq("api_key_id", api_key_id)
            .eq("account_id", account_id)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!key) {
            return res.status(404).json({ success: false, message: "API key not found." });
        }

        const { error } = await supabase
            .from("api_keys")
            .update({ is_active: false })
            .eq("api_key_id", api_key_id);

        if (error) throw error;

        return res.status(200).json({ success: true, message: "API key revoked." });
    } catch (err) {
        console.error("[revokeApiKey]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

module.exports = { createApiKey, listApiKeys, revokeApiKey };
