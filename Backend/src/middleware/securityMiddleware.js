/**
 * Security Middleware — Kharcha Backend
 *
 * ─── WHY NO CSRF PROTECTION? ────────────────────────────────────────────────
 * CSRF (Cross-Site Request Forgery) attacks exploit the browser's automatic
 * sending of cookies with cross-origin requests. This API uses JWT tokens
 * carried in the Authorization header — NOT in cookies. Browsers do NOT
 * automatically attach Authorization headers on cross-origin requests, so
 * CSRF attacks cannot occur.
 *
 * TL;DR: CSRF is a cookie-auth vulnerability. Bearer-token APIs are immune.
 *
 * ─── SESSION TOKEN ARCHITECTURE ─────────────────────────────────────────────
 * The JWT ("session token") lives on BOTH sides:
 *   - Frontend: stores it (SecureStorage on mobile / memory on web)
 *               attaches it to every protected request in the Authorization header
 *   - Backend:  validates it on every protected endpoint via the authenticate
 *               middleware — the signature check IS the session verification
 *
 * ─── WHAT THIS FILE PROVIDES ────────────────────────────────────────────────
 *   1. Security headers (replaces helmet — no extra package needed)
 *   2. In-memory rate limiter (per IP, no Redis needed for small deployments)
 * ────────────────────────────────────────────────────────────────────────────
 */

// ─── 1. Security Headers ─────────────────────────────────────────────────────
/**
 * Adds essential HTTP security headers to every response.
 * Equivalent to the core features of the `helmet` package.
 */
const securityHeaders = (req, res, next) => {
    // Prevent clickjacking
    res.setHeader("X-Frame-Options", "DENY");

    // Prevent MIME-type sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Enable XSS filter in older browsers
    res.setHeader("X-XSS-Protection", "1; mode=block");

    // Only send origin in referrer (not full URL)
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    // Don't cache sensitive API responses
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");

    // Minimal permissions policy
    res.setHeader(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()",
    );

    // Content Security Policy
    // Swagger UI needs inline scripts/styles and CDN assets to render,
    // so /api/docs gets a permissive policy while everything else stays strict.
    if (req.path.startsWith("/api/docs")) {
        res.setHeader(
            "Content-Security-Policy",
            [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data: https:",
                "font-src 'self' data:",
                "connect-src 'self'",
                "frame-ancestors 'none'",
            ].join("; "),
        );
    } else {
        res.setHeader(
            "Content-Security-Policy",
            "default-src 'none'; frame-ancestors 'none'",
        );
    }

    next();
};

// ─── 2. In-Memory Rate Limiter ────────────────────────────────────────────────
/**
 * Simple sliding-window rate limiter using an in-memory Map.
 * Suitable for single-process deployments.
 * For multi-process/multi-server deployments, swap the Map for Redis.
 *
 * @param {object} options
 * @param {number} options.windowMs   - Time window in ms (default: 15 minutes)
 * @param {number} options.max        - Max requests per window (default: 100)
 * @param {string} options.message    - Error message when limit exceeded
 */
const rateLimiter = ({
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = "Too many requests. Please try again later.",
} = {}) => {
    // Map<ip, { count, resetAt }>
    const store = new Map();

    // Clean up expired entries every window to prevent memory leaks
    setInterval(() => {
        const now = Date.now();
        for (const [ip, record] of store.entries()) {
            if (record.resetAt <= now) store.delete(ip);
        }
    }, windowMs);

    return (req, res, next) => {
        const ip = req.ip || req.socket?.remoteAddress || "unknown";
        const now = Date.now();

        let record = store.get(ip);

        if (!record || record.resetAt <= now) {
            record = { count: 1, resetAt: now + windowMs };
        } else {
            record.count += 1;
        }

        store.set(ip, record);

        // Attach rate-limit info to headers (optional but helpful for clients)
        res.setHeader("X-RateLimit-Limit", max);
        res.setHeader("X-RateLimit-Remaining", Math.max(0, max - record.count));
        res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetAt / 1000));

        if (record.count > max) {
            return res.status(429).json({
                success: false,
                message,
                retry_after_seconds: Math.ceil((record.resetAt - now) / 1000),
            });
        }

        next();
    };
};

// ─── Preset limiters ─────────────────────────────────────────────────────────

/** Strict limit for auth endpoints (OTP sending, signin attempts) */
const authRateLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message:
        "Too many authentication attempts. Please wait 15 minutes before trying again.",
});

/** Strict limit for OTP sending (prevent SMS/email flooding) */
const otpRateLimiter = rateLimiter({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5,
    message:
        "Too many OTP requests. Please wait 10 minutes before requesting a new code.",
});

/** Standard limit for general API endpoints */
const apiRateLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    message: "Rate limit exceeded. Please slow down.",
});

/** Transfer-specific limit to prevent abuse */
const transferRateLimiter = rateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: "Too many transfer requests. Please wait before trying again.",
});

module.exports = {
    securityHeaders,
    rateLimiter,
    authRateLimiter,
    otpRateLimiter,
    apiRateLimiter,
    transferRateLimiter,
};
