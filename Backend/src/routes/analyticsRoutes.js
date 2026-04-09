const analyticsRouter = require("express").Router();
const { authenticate } = require("../middleware/authmiddleware");
const { validateDateRange } = require("../middleware/dateRangeValidator");
const { getPieChart, getBarChart, getLineChart, getIncomeVsExpense } = require("../controllers/analyticsController");

analyticsRouter.get("/pie",               authenticate, validateDateRange, getPieChart);
analyticsRouter.get("/bar",               authenticate, validateDateRange, getBarChart);
analyticsRouter.get("/line",              authenticate, validateDateRange, getLineChart);
analyticsRouter.get("/income-vs-expense", authenticate, validateDateRange, getIncomeVsExpense);

module.exports = analyticsRouter;