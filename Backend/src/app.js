const express    = require("express");
const cors       = require("cors");
const cookieParser = require("cookie-parser");

const testRoutes        = require("./routes/testRoutes");
const authRoutes        = require("./routes/authRoutes");
const biometricRoutes   = require("./routes/biometricRoutes");
const walletRoutes      = require("./routes/walletRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const profileRoutes     = require("./routes/profileRoutes");
const posRoutes         = require("./routes/posRoutes");
const cardRoutes        = require("./routes/cardRoutes");
const apiKeyRoutes      = require("./routes/apiKeyRoutes");
const { swaggerUi, swaggerSpec, swaggerOptions } = require("./swagger");
const { securityHeaders, apiRateLimiter, authRateLimiter } = require("./middleware/securityMiddleware");

const khaltiRoutes   = require("./routes/khaltiRoutes");
const adminRoutes    = require("./routes/adminRoutes");
const giftCardRoutes = require("./routes/giftCardRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const { publicRouter: qrPublicRoutes, orgRouter: qrOrgRoutes } = require("./routes/qrCodeRoutes");

const expenseRoutes    = require("./routes/expenseRoutes");
const incomeRoutes     = require("./routes/incomeRoutes");
const budgetRoutes     = require("./routes/budgetRoutes");
const paymentRoutes    = require("./routes/paymentRoutes");
const payPortalRoutes  = require("./routes/payPortalRoutes");

const app = express();

// ── Security Headers ─────────────────────────────────────────
app.use(securityHeaders);

// ── CORS ─────────────────────────────────────────────────────
// credentials: true is required for cross-origin cookie support (Vercel → Railway).
// CORS_ORIGIN must be the exact frontend origin — wildcards ("*") are blocked by
// browsers when credentials are included.
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim());

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (curl, Postman, Swagger UI same-host)
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error(`CORS: origin '${origin}' is not allowed`));
            }
        },
        credentials: true,   // <-- required for cookies
        methods:     ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-Payment-Token"],
        exposedHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
    }),
);

// ── Cookie Parser ─────────────────────────────────────────────
// Must come before any route that reads req.cookies.
app.use(cookieParser());

// ── Body Parsing ─────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false }));

// ── Global Rate Limit ────────────────────────────────────────
app.use("/api", apiRateLimiter);

// ── API Docs (Swagger UI) ────────────────────────────────────
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

// ── Routes ───────────────────────────────────────────────────
app.use("/api/test",         testRoutes);
app.use("/api/khalti",       khaltiRoutes);
app.use("/api/auth",         authRateLimiter, authRoutes);
app.use("/api/auth/biometric", authRateLimiter, biometricRoutes);
app.use("/api/wallet",       walletRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/profile",      profileRoutes);
app.use("/api/pos",          posRoutes);
app.use("/api/cards",        cardRoutes);
app.use("/api/org/api-keys", apiKeyRoutes);
app.use("/api/admin",        adminRoutes);
app.use("/api/gift-cards",   giftCardRoutes);
app.use("/api/categories",   categoryRoutes);
app.use("/api/org/qr-codes", qrOrgRoutes);
app.use("/api/qr-codes",     qrPublicRoutes);
app.use("/api/expenses",     expenseRoutes);
app.use("/api/income",       incomeRoutes);
app.use("/api/budgets",      budgetRoutes);
app.use("/api/payment",      paymentRoutes);
app.use("/api/pay-portal",   payPortalRoutes);

// ── AI Assistant ──────────────────────────────────────────────
const aiRoutes = require("./routes/aiRoutes");
app.use("/api/ai", aiRoutes);

// ── Default ──────────────────────────────────────────────────
app.get("/", (req, res) => res.redirect("/api/docs"));

// ── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: "Route not found." });
});

// ── Global Error Handler ──────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error("[GlobalError]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
});

module.exports = app;