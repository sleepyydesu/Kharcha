const express = require("express");
const { authenticate } = require("../middleware/authmiddleware");
const {
  getCatalog,
  getTestAccounts,
  lookupBill,
} = require("../controllers/servicePaymentController");

const router = express.Router();

router.use(authenticate);
router.get("/catalog", getCatalog);
router.get("/test-accounts", getTestAccounts);
router.post("/lookup", lookupBill);

module.exports = router;
