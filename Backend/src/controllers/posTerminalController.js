const bcrypt = require("bcrypt");
const supabase = require("../services/supabaseClient");
const {
    generateTerminalCredential,
    terminalCredentialPrefix,
} = require("../utils/posPaymentUtils");

const registerTerminal = async (req, res) => {
    try {
        const { account_id } = req.account;
        const name = req.body?.name?.trim();
        if (!name || name.length > 100) {
            return res.status(400).json({ success: false, message: "name is required and must be at most 100 characters." });
        }

        const credential = generateTerminalCredential();
        const credentialHash = await bcrypt.hash(credential, 12);
        const { data: terminal, error } = await supabase
            .from("pos_terminals")
            .insert({
                account_id,
                name,
                credential_prefix: terminalCredentialPrefix(credential),
                credential_hash: credentialHash,
            })
            .select("terminal_id, name, is_active, created_at")
            .single();

        if (error) throw error;
        return res.status(201).json({
            success: true,
            message: "POS terminal registered. Save the credential now; it will not be shown again.",
            terminal,
            credential,
        });
    } catch (err) {
        console.error("[registerTerminal]", err);
        return res.status(500).json({ success: false, message: "Failed to register POS terminal." });
    }
};

const listTerminals = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("pos_terminals")
            .select("terminal_id, name, is_active, last_used_at, revoked_at, created_at, updated_at")
            .eq("account_id", req.account.account_id)
            .order("created_at", { ascending: false });
        if (error) throw error;
        return res.json({ success: true, terminals: data || [] });
    } catch (err) {
        console.error("[listTerminals]", err);
        return res.status(500).json({ success: false, message: "Failed to load POS terminals." });
    }
};

const revokeTerminal = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("pos_terminals")
            .update({
                is_active: false,
                revoked_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("terminal_id", req.params.terminal_id)
            .eq("account_id", req.account.account_id)
            .select("terminal_id, name, is_active, revoked_at")
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, message: "POS terminal not found." });
        return res.json({ success: true, message: "POS terminal revoked.", terminal: data });
    } catch (err) {
        console.error("[revokeTerminal]", err);
        return res.status(500).json({ success: false, message: "Failed to revoke POS terminal." });
    }
};

module.exports = { registerTerminal, listTerminals, revokeTerminal };
