const incomeRouter = require("express").Router();
const { authenticate } = require("../middleware/authmiddleware");
const { validateDateRange } = require("../middleware/dateRangeValidator");
const { getIncome, getIncomeById, createIncome, updateIncome, deleteIncome } = require("../controllers/incomeController");

incomeRouter.get("/",       authenticate, validateDateRange, getIncome);
incomeRouter.get("/:id",    authenticate, getIncomeById);
incomeRouter.post("/",      authenticate, createIncome);
incomeRouter.put("/:id",    authenticate, updateIncome);
incomeRouter.delete("/:id", authenticate, deleteIncome);

module.exports = incomeRouter;