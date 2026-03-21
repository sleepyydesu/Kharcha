const express = require("express");
const cors = require("cors");

const testRoutes = require("./routes/testRoutes");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/test", testRoutes);

// Default route
app.get("/", (req, res) => {
    res.send("Backend running!");
});

module.exports = app;
