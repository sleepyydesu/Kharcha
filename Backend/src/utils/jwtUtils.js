const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const SIGNUP_TOKEN_SECRET = process.env.SIGNUP_TOKEN_SECRET || process.env.JWT_SECRET;

/**
 * Short-lived token issued after OTP verification.
 * Proves the user owns the email before completing signup.
 * Expires in 15 minutes.
 */
const generateSignupToken = (payload) => {
    return jwt.sign(payload, SIGNUP_TOKEN_SECRET, { expiresIn: "15m" });
};

const verifySignupToken = (token) => {
    try {
        return jwt.verify(token, SIGNUP_TOKEN_SECRET);
    } catch {
        return null;
    }
};

/**
 * Long-lived auth token issued after signup/signin.
 * Expires in 7 days.
 */
const generateAuthToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
};

const verifyAuthToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
};

module.exports = {
    generateSignupToken,
    verifySignupToken,
    generateAuthToken,
    verifyAuthToken,
};