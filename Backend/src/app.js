const express = require("express");
const cors = require("cors");

const testRoutes = require("./routes/testRoutes");
const authRoutes = require("./routes/authRoutes");
const walletRoutes = require("./routes/walletRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const profileRoutes = require("./routes/profileRoutes");
const posRoutes = require("./routes/posRoutes");
const cardRoutes = require("./routes/cardRoutes");
const apiKeyRoutes = require("./routes/apiKeyRoutes");
const { swaggerUi, swaggerSpec, swaggerOptions } = require("./swagger");
const {
    securityHeaders,
    apiRateLimiter,
    authRateLimiter,
} = require("./middleware/securityMiddleware");

const khaltiRoutes = require("./routes/khaltiRoutes");

const errorHandler = require("./middlewares/errorHandler");

const app = express();

// ── Security Headers ─────────────────────────────────────────
app.use(securityHeaders);

// ── CORS ─────────────────────────────────────────────────────
app.use(
    cors({
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
        exposedHeaders: [
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
            "X-RateLimit-Reset",
        ],
    }),
);

// ── Body Parsing ─────────────────────────────────────────────
app.use(express.json({ limit: "10mb" })); // 10mb for base64 image uploads
app.use(express.urlencoded({ extended: false }));

// ── Global Rate Limit ────────────────────────────────────────
app.use("/api", apiRateLimiter);

// ── API Docs (Swagger UI) ────────────────────────────────────
app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, swaggerOptions),
);

// ── Routes ───────────────────────────────────────────────────
app.use("/api/test", testRoutes);
app.use("/api/khalti", khaltiRoutes);
app.use("/api/auth", authRateLimiter, authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/pos", posRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/org/api-keys", apiKeyRoutes);

// ── Default ──────────────────────────────────────────────────
app.get("/", (req, res) => {
    res.redirect("/api/docs");
});

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

// Error handling middleware
app.use(errorHandler);

module.exports = app;
