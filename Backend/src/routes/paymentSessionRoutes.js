const express = require("express");
const { flexAuth, requireRole } = require("../middleware/authmiddleware");
const {
    createPaymentSession,
    getPaymentSession,
    cancelPaymentSession,
} = require("../controllers/posPaymentSessionController");

const router = express.Router();
router.use(flexAuth, requireRole("organization"));
router.post("/", createPaymentSession);
router.get("/:id", getPaymentSession);
router.post("/:id/cancel", cancelPaymentSession);

module.exports = router;
