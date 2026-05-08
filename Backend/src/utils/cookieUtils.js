/**
 * cookieUtils.js
 *
 * Centralises every cookie-related constant and helper so that
 * authController + authmiddleware stay in sync automatically.
 *
 * Dev  (NODE_ENV !== "production"):
 *   secure: false  — plain HTTP on localhost works fine
 *   sameSite: "lax" — same-origin requests carry the cookie
 *
 * Prod (NODE_ENV === "production"):
 *   secure: true   — HTTPS only (Railway backend + Vercel frontend)
 *   sameSite: "none" — cross-origin cookie required for Vercel ↔ Railway
 *
 * Both environments: httpOnly: true — JS can never read these cookies.
 */

const IS_PROD = process.env.NODE_ENV === "production";

const ACCESS_COOKIE  = "kharcha_access";
const REFRESH_COOKIE = "kharcha_refresh";

const ACCESS_MAX_AGE_MS  = 15 * 60 * 1000;           // 15 minutes
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;  // 7 days

const baseCookieOptions = {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: IS_PROD ? "none" : "lax",
    path:     "/",
};

/**
 * Write both auth cookies onto the response.
 * @param {import("express").Response} res
 * @param {string} accessToken  - signed JWT
 * @param {string} refreshToken - raw opaque token (hex string)
 */
const setAuthCookies = (res, accessToken, refreshToken) => {
    res.cookie(ACCESS_COOKIE, accessToken, {
        ...baseCookieOptions,
        maxAge: ACCESS_MAX_AGE_MS,
    });
    res.cookie(REFRESH_COOKIE, refreshToken, {
        ...baseCookieOptions,
        maxAge: REFRESH_MAX_AGE_MS,
    });
};

/**
 * Expire / clear both auth cookies.
 * Must pass the same options that were used to set them.
 * @param {import("express").Response} res
 */
const clearAuthCookies = (res) => {
    res.clearCookie(ACCESS_COOKIE,  baseCookieOptions);
    res.clearCookie(REFRESH_COOKIE, baseCookieOptions);
};

module.exports = {
    ACCESS_COOKIE,
    REFRESH_COOKIE,
    setAuthCookies,
    clearAuthCookies,
};
