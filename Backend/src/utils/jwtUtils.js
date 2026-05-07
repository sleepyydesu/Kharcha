const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const JWT_SECRET = process.env.JWT_SECRET;
const SIGNUP_TOKEN_SECRET = process.env.SIGNUP_TOKEN_SECRET || process.env.JWT_SECRET;

/**
 * Short-lived token issued after OTP verification.
 * Proves the user owns the email before completing signup.
 * Expires in 15 minutes.
 */
const generateSignupToken = (payload) => {
    return jwt.sign(payload, SIGNUP_TOKEN_SECRET, { expiresIn: "30m" });
};

const verifySignupToken = (token) => {
    try {
        return jwt.verify(token, SIGNUP_TOKEN_SECRET);
    } catch {
        return null;
    }
};

/**
 * Short-lived access token issued after signup/signin.
 * Sent as an httpOnly cookie — NOT returned in the JSON body.
 * Expires in 15 minutes.
 */
const generateAuthToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
};

const verifyAuthToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
};

/**
 * Opaque refresh token — a cryptographically random hex string.
 * NOT a JWT. Stored hashed in the DB; the raw token goes in an httpOnly cookie.
 * This way: even if the DB is breached, raw tokens are useless.
 */
const generateRefreshToken = () => {
    return crypto.randomBytes(64).toString("hex");
};

/**
 * One-way SHA-256 hash of a raw token for DB storage.
 */
const hashToken = (token) => {
    return crypto.createHash("sha256").update(token).digest("hex");
};

module.exports = {
    generateSignupToken,
    verifySignupToken,
    generateAuthToken,
    verifyAuthToken,
    generateRefreshToken,
    hashToken,
};
