const crypto = require("crypto");

const ACTIVE_SESSION_STATUSES = ["pending", "selected", "awaiting_card", "awaiting_pin"];
const TERMINAL_TOKEN_PREFIX = "pos_live_";

function generatePaymentSessionId() {
    return `PAY-${crypto.randomBytes(6).toString("base64url").toUpperCase()}`;
}

function generateTerminalCredential() {
    return `${TERMINAL_TOKEN_PREFIX}${crypto.randomBytes(32).toString("base64url")}`;
}

function terminalCredentialPrefix(credential) {
    return credential.slice(0, 20);
}

function normalizeCardIdentifier(value) {
    return String(value || "").replace(/\s+/g, "").toUpperCase();
}

function parseSessionAmount(value) {
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 1 ? amount : null;
}

function isExpired(expiresAt, now = new Date()) {
    return !expiresAt || new Date(expiresAt).getTime() <= now.getTime();
}

function mapAuthorizationError(message = "") {
    const mappings = [
        ["SESSION_NOT_FOUND", 404, "SESSION_NOT_FOUND", "Payment session not found."],
        ["SESSION_EXPIRED", 410, "SESSION_EXPIRED", "Payment session has expired."],
        ["SESSION_CANCELLED", 409, "SESSION_CANCELLED", "Payment session was cancelled."],
        ["SESSION_FAILED", 409, "SESSION_FAILED", "Payment session has failed."],
        ["SESSION_TERMINAL_MISMATCH", 403, "SESSION_TERMINAL_MISMATCH", "This session was selected by another terminal."],
        ["SESSION_ORG_MISMATCH", 403, "SESSION_ORG_MISMATCH", "Payment session does not belong to this terminal's organization."],
        ["CARD_INACTIVE", 403, "CARD_INACTIVE", "Card is not active."],
        ["ACCOUNT_INACTIVE", 403, "ACCOUNT_INACTIVE", "Cardholder account is inactive."],
        ["INSUFFICIENT_BALANCE", 400, "INSUFFICIENT_BALANCE", "Insufficient wallet balance."],
        ["EXCEEDS_DAILY_LIMIT", 400, "DAILY_LIMIT_EXCEEDED", "Card daily spend limit reached."],
        ["WALLET_INACTIVE", 403, "WALLET_INACTIVE", "One of the wallets is inactive."],
        ["WALLET_NOT_FOUND", 400, "WALLET_NOT_FOUND", "Wallet not found."],
        ["SELF_TRANSFER", 400, "SELF_CHARGE", "Cannot charge the merchant's own card."],
    ];

    const found = mappings.find(([needle]) => message.includes(needle));
    if (!found) return null;
    return { status: found[1], errorCode: found[2], message: found[3] };
}

module.exports = {
    ACTIVE_SESSION_STATUSES,
    TERMINAL_TOKEN_PREFIX,
    generatePaymentSessionId,
    generateTerminalCredential,
    terminalCredentialPrefix,
    normalizeCardIdentifier,
    parseSessionAmount,
    isExpired,
    mapAuthorizationError,
};
