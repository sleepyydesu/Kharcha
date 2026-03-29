const express = require("express");
const {
    getStatements,
    getTransactionDetail,
    getCategories,
    getOrgTypes,
} = require("../controllers/transactionController");
const { authenticate } = require("../middleware/authmiddleware");

const router = express.Router();

// Public (still good to cache-bust with auth context):
// GET /api/transactions/categories  — transaction categories list
// GET /api/transactions/org-types   — organization type list
router.get("/categories", getCategories);
router.get("/org-types",  getOrgTypes);

// Protected:
router.use(authenticate);

// GET /api/transactions             — paginated statement list (?page=1&limit=20&type=all|sent|received)
router.get("/", getStatements);

// GET /api/transactions/:id         — full transaction detail
router.get("/:transaction_id", getTransactionDetail);

module.exports = router;
