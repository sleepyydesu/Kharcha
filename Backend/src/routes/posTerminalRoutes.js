const express = require("express");
const { authenticate, requireRole } = require("../middleware/authmiddleware");
const {
    registerTerminal,
    listTerminals,
    revokeTerminal,
} = require("../controllers/posTerminalController");

const router = express.Router();
router.use(authenticate, requireRole("organization"));
router.post("/", registerTerminal);
router.get("/", listTerminals);
router.post("/:terminal_id/revoke", revokeTerminal);

module.exports = router;
