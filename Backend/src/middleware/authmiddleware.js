const { verifyAuthToken } = require("../utils/jwtUtils");

/**
 * Middleware: authenticate any request.
 * Attaches decoded token payload to req.account.
 *
 * Usage:
 *   router.get("/profile", authenticate, getProfile);
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "No token provided. Please sign in." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAuthToken(token);

    if (!decoded) {
        return res.status(401).json({ success: false, message: "Invalid or expired token. Please sign in again." });
    }

    req.account = decoded; // { account_id, account_type, email }
    next();
};

/**
 * Middleware factory: restrict access to specific account types.
 *
 * Usage:
 *   router.get("/admin-only", authenticate, requireRole("admin"), handler);
 *   router.get("/users-and-orgs", authenticate, requireRole("user", "organization"), handler);
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.account || !roles.includes(req.account.account_type)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role: ${roles.join(" or ")}.`,
            });
        }
        next();
    };
};

module.exports = { authenticate, requireRole };