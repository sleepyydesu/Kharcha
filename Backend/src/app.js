const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const testRoutes = require("./routes/testRoutes");
const authRoutes = require("./routes/authRoutes");
const biometricRoutes = require("./routes/biometricRoutes");
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
const { authenticate } = require("./middleware/authmiddleware");

const khaltiRoutes = require("./routes/khaltiRoutes");
const adminRoutes = require("./routes/adminRoutes");
const giftCardRoutes = require("./routes/giftCardRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const {
  publicRouter: qrPublicRoutes,
  orgRouter: qrOrgRoutes,
} = require("./routes/qrCodeRoutes");
const kycRoutes = require("./routes/kycRoutes");

const expenseRoutes = require("./routes/expenseRoutes");
const incomeRoutes = require("./routes/incomeRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const payPortalRoutes = require("./routes/payPortalRoutes");
const oauthRoutes = require("./routes/oauthRoutes");

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

// Matches VS Code / GitHub Codespaces / devtunnels forwarded ports, e.g.:
//   https://2991dwht-5173.inc1.devtunnels.ms
//   https://abc123-5173.preview.app.github.dev
const DEV_TUNNEL_RE =
  /^https:\/\/[a-z0-9]+-\d+\.(inc\d+\.devtunnels\.ms|preview\.app\.github\.dev)$/i;

function isOriginAllowed(origin) {
  if (!origin) return true; // curl / Postman / same-host Swagger
  if (allowedOrigins.includes(origin)) return true;
  if (process.env.NODE_ENV !== "production" && DEV_TUNNEL_RE.test(origin))
    return true;
  return false;
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' is not allowed`));
      }
    },
    credentials: true, // <-- required for cookies
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-API-Key",
      "X-Payment-Token",
    ],
    exposedHeaders: [
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
    ],
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
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, swaggerOptions),
);

// ── Routes ───────────────────────────────────────────────────
app.use("/api/test", testRoutes);
app.use("/api/khalti", khaltiRoutes);
app.use("/api/auth", authRateLimiter, authRoutes);

// Biometric routes are always called by a logged-in user.
// authenticate runs first so req.user.id is populated before authRateLimiter
// evaluates its keyFn — this means the rate limit is per-user, not per-IP.
app.use("/api/auth/biometric", authRateLimiter, biometricRoutes);

app.use("/api/wallet", walletRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/pos", posRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/org/api-keys", apiKeyRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/gift-cards", giftCardRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/org/qr-codes", qrOrgRoutes);
app.use("/api/qr-codes", qrPublicRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/income", incomeRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/pay-portal", payPortalRoutes);
app.use("/api/oauth", oauthRoutes);
app.use("/api/kyc", kycRoutes);

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
