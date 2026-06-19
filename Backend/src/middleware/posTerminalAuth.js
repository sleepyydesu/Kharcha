const bcrypt = require("bcrypt");
const supabase = require("../services/supabaseClient");
const {
    TERMINAL_TOKEN_PREFIX,
    terminalCredentialPrefix,
} = require("../utils/posPaymentUtils");

async function authenticatePosTerminal(req, res, next) {
    try {
        const authorization = req.headers.authorization || "";
        const rawCredential =
            req.headers["x-pos-token"] ||
            (authorization.startsWith("Terminal ") ? authorization.slice(9) : null);

        if (!rawCredential || !rawCredential.startsWith(TERMINAL_TOKEN_PREFIX)) {
            return res.status(401).json({
                success: false,
                error_code: "INVALID_TERMINAL_CREDENTIAL",
                message: "A valid POS terminal credential is required.",
            });
        }

        const { data: candidates, error } = await supabase
            .from("pos_terminals")
            .select("terminal_id, account_id, name, credential_hash, is_active, revoked_at")
            .eq("credential_prefix", terminalCredentialPrefix(rawCredential))
            .eq("is_active", true);

        if (error) throw error;

        let terminal = null;
        for (const candidate of candidates || []) {
            if (await bcrypt.compare(rawCredential, candidate.credential_hash)) {
                terminal = candidate;
                break;
            }
        }

        if (!terminal || terminal.revoked_at) {
            return res.status(401).json({
                success: false,
                error_code: "TERMINAL_REVOKED",
                message: "Terminal credential is invalid, disabled, or revoked.",
            });
        }

        req.posTerminal = terminal;
        supabase
            .from("pos_terminals")
            .update({ last_used_at: new Date().toISOString() })
            .eq("terminal_id", terminal.terminal_id)
            .then(() => {});
        next();
    } catch (err) {
        console.error("[authenticatePosTerminal]", err);
        return res.status(500).json({ success: false, message: "Terminal authentication failed." });
    }
}

module.exports = { authenticatePosTerminal };
