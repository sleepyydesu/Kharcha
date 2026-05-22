const express = require("express");
const router = express.Router();
const {
  initiateEsewaPayment,
  verifyEsewaPayment,
} = require("../controllers/esewaController");
const { authenticate } = require("../middleware/authmiddleware"); // We need the user to be logged in to initiate payment, so we can read their account_id from the JWT. But for verification, eSewa will redirect the user here, so no JWT is expected.

router.post("/initiate", authenticate, initiateEsewaPayment);
router.get("/verify", verifyEsewaPayment);

module.exports = router;
