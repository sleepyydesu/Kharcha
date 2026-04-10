const router = require("express").Router();
const { authenticate } = require("../middleware/authmiddleware");
const { validateDateRange } = require("../middleware/dateRangeValidator");
const {
    getExpenseOverview,
    getExpensesByCategory,
    getExpenseById,
    createExpense,
    updateExpense,
    deleteExpense,
} = require("../controllers/expenseController");

// Dashboard overview (requires date range)
router.get("/", authenticate, validateDateRange, getExpenseOverview);

// Category detail view (requires date range)
router.get("/category/:categoryId", authenticate, validateDateRange, getExpensesByCategory);

// Single expense CRUD
router.get("/:id",     authenticate, getExpenseById);
router.post("/",       authenticate, createExpense);
router.put("/:id",     authenticate, updateExpense);
router.delete("/:id",  authenticate, deleteExpense);

module.exports = router;