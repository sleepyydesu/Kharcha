const express = require("express");
const { authenticate } = require("../middleware/authmiddleware");
const { chatWithAI } = require("../controllers/aiController");

const router = express.Router();

// POST /api/ai/chat
router.post("/chat", authenticate, chatWithAI);

module.exports = router;