const budgetRouter = require("express").Router();
const { authenticate } = require("../middleware/authmiddleware");
const { getBudgets, getBudgetById, createBudget, updateBudget, deleteBudget } = require("../controllers/budgetController");

budgetRouter.get("/",       authenticate, getBudgets);
budgetRouter.get("/:id",    authenticate, getBudgetById);
budgetRouter.post("/",      authenticate, createBudget);
budgetRouter.put("/:id",    authenticate, updateBudget);
budgetRouter.delete("/:id", authenticate, deleteBudget);

module.exports = budgetRouter;