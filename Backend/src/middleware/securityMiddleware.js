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
 * @param {object}   options
 * @param {number}   options.windowMs  - Time window in ms (default: 15 minutes)
 * @param {number}   options.max       - Max requests per window (default: 100)
 * @param {string}   options.message   - Error message when limit exceeded
 * @param {Function} options.keyFn     - (req) => string — custom bucket key.
 *                                       Defaults to req.ip when omitted.
 *                                       Use this to key by email or user ID so
 *                                       users behind the same IP/proxy don't
 *                                       share each other's rate-limit bucket.
 */
const rateLimiter = ({
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = "Too many requests. Please try again later.",
    keyFn = null,
} = {}) => {
    // Map<key, { count, resetAt }>
    const store = new Map();

    // Clean up expired entries every window to prevent memory leaks.
    // Note: the loop variable is named "key" here to avoid shadowing the
    // "ip" variable that used to live in the middleware closure below.
    setInterval(() => {
        const now = Date.now();
        for (const [key, record] of store.entries()) {
            if (record.resetAt <= now) store.delete(key);
        }
    }, windowMs);

    return (req, res, next) => {
        // Resolve the bucket key. keyFn takes the full request so callers can
        // inspect req.body, req.user, req.ip, or any combination they need.
        const ip = req.ip || req.socket?.remoteAddress || "unknown";
        const key = keyFn ? keyFn(req, ip) : ip;
        const now = Date.now();

        let record = store.get(key);

        if (!record || record.resetAt <= now) {
            record = { count: 1, resetAt: now + windowMs };
        } else {
            record.count += 1;
        }

        store.set(key, record);

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

/**
 * Strict limit for auth endpoints (signin attempts, OTP verification).
 * Keys by userId when the user is already authenticated (req.user set by the
 * authenticate middleware), falls back to email in the request body, then IP.
 * This means users behind the same NAT/proxy don't share each other's bucket.
 */
const authRateLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message:
        "Too many authentication attempts. Please wait 15 minutes before trying again.",
    keyFn: (req, ip) => {
        const userId = req.user?.id;
        const email  = req.body?.email?.toLowerCase?.();
        return `auth:${userId || email || ip}`;
    },
});

/**
 * Strict limit for OTP-sending endpoints (prevent email flooding).
 * Keys by email address so the limit is per-recipient, not per-IP.
 * Falls back to IP if no email is present in the body.
 */
const otpRateLimiter = rateLimiter({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5,
    message:
        "Too many OTP requests. Please wait 10 minutes before requesting a new code.",
    keyFn: (req, ip) => {
        const email = req.body?.email?.toLowerCase?.();
        return `otp:${email || ip}`;
    },
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

// ─── 3. Account Lockout ───────────────────────────────────────────────────────
/**
 * Creates a per-key failure tracker that locks a key after too many failures.
 *
 * Usage pattern (inside a controller):
 *
 *   const status = loginLockout.check(key);
 *   if (status) return res.status(423).json({ ... status ... });
 *
 *   // … attempt the credential check …
 *
 *   if (!valid) {
 *     const result = loginLockout.failure(key);
 *     return res.status(result.locked ? 423 : 401).json({ ... result ... });
 *   }
 *   loginLockout.success(key);   // clear on success
 *
 * @param {object} options
 * @param {number} options.maxFailures    - Failures before lockout (default: 5)
 * @param {number} options.lockDurationMs - Lock duration in ms (default: 15 min)
 */
const createLockoutStore = ({
    maxFailures   = 5,
    lockDurationMs = 15 * 60 * 1000,
} = {}) => {
    // Map<key, { failures: number, lockedUntil: number|null }>
    const store = new Map();

    // Prune entries whose lock window has fully expired.
    setInterval(() => {
        const now = Date.now();
        for (const [key, record] of store.entries()) {
            if (!record.lockedUntil || record.lockedUntil <= now) {
                store.delete(key);
            }
        }
    }, lockDurationMs);

    return {
        /**
         * Check whether a key is currently locked.
         * Returns null when clear, or { locked, retryAfterSeconds } when locked.
         */
        check(key) {
            const record = store.get(key);
            if (!record?.lockedUntil) return null;
            const now = Date.now();
            if (record.lockedUntil > now) {
                return {
                    locked: true,
                    retryAfterSeconds: Math.ceil((record.lockedUntil - now) / 1000),
                };
            }
            return null;
        },

        /**
         * Record a failed attempt.
         * Returns { locked, failuresRemaining, retryAfterSeconds }.
         */
        failure(key) {
            const now = Date.now();
            let record = store.get(key) || { failures: 0, lockedUntil: null };

            // If a previous lock already expired, start fresh.
            if (record.lockedUntil && record.lockedUntil <= now) {
                record = { failures: 0, lockedUntil: null };
            }

            record.failures += 1;
            const locked = record.failures >= maxFailures;
            if (locked) record.lockedUntil = now + lockDurationMs;
            store.set(key, record);

            return {
                locked,
                failuresRemaining: Math.max(0, maxFailures - record.failures),
                retryAfterSeconds: locked ? Math.ceil(lockDurationMs / 1000) : null,
            };
        },

        /**
         * Clear the failure record after a successful authentication.
         */
        success(key) {
            store.delete(key);
        },
    };
};

/**
 * Login lockout — keyed by the identifier the user supplies (email or phone).
 * Locks after 5 consecutive failed sign-in attempts for 15 minutes.
 */
const loginLockout = createLockoutStore({
    maxFailures:    5,
    lockDurationMs: 15 * 60 * 1000,
});

/**
 * MPIN lockout — keyed by account_id.
 * Locks after 5 consecutive incorrect MPINs for 15 minutes.
 * Applied to: wallet transfers, /mpin/verify, /mpin/change.
 */
const mpinLockout = createLockoutStore({
    maxFailures:    5,
    lockDurationMs: 15 * 60 * 1000,
});

module.exports = {
    securityHeaders,
    rateLimiter,
    authRateLimiter,
    otpRateLimiter,
    apiRateLimiter,
    transferRateLimiter,
    createLockoutStore,
    loginLockout,
    mpinLockout,
};