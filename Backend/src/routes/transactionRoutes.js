const express = require("express");
const {
    getStatements,
    getTransactionDetail,
    getCategories,
} = require("../controllers/transactionController");
const { authenticate } = require("../middleware/authmiddleware");

const router = express.Router();

// Public:
// GET /api/transactions/categories  — transaction categories list
router.get("/categories", getCategories);

// Protected:
router.use(authenticate);

// GET /api/transactions             — paginated statement list (?page=1&limit=20&type=all|sent|received&category_id=1&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD)
router.get("/", getStatements);

// GET /api/transactions/:id         — full transaction detail
router.get("/:transaction_id", getTransactionDetail);

module.exports = router;
