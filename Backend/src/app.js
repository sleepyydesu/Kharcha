const express = require("express");
const cors = require("cors");

const testRoutes = require("./routes/testRoutes");

const khaltiRoutes = require("./routes/khaltiRoutes");

const errorHandler = require("./middlewares/errorHandler");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/test", testRoutes);
app.use("/api/khalti", khaltiRoutes);

// Default route
app.get("/", (req, res) => {
  res.send("Backend running!");
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;
