const express = require("express");
const cors = require("cors");

const testRoutes = require("./routes/testRoutes");
const authRoutes = require("./routes/authRoutes");
const { swaggerUi, swaggerSpec, swaggerOptions } = require("./swagger");

const app = express();

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── API Docs (Swagger UI) ────────────────────────────────────
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

// ── Routes ───────────────────────────────────────────────────
app.use("/api/test", testRoutes);
app.use("/api/auth", authRoutes);

// ── Default ──────────────────────────────────────────────────
app.get("/", (req, res) => {
    res.redirect("/api/docs");
});

module.exports = app;