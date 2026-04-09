const express = require("express");
const router = express.Router();
const {
  listServices,
  makeServicePayment,
} = require("../controllers/servicesController");
const { authenticate } = require("../middleware/authmiddleware");

// GET /api/services/list → public, no auth needed
router.get("/list", listServices);

// POST /api/services/topup → requires auth

router.post("/topup", authenticate, makeServicePayment);

// POST /api/services/utility → requires auth

router.post("/utility", authenticate, makeServicePayment);

module.exports = router;