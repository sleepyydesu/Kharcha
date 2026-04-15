/**
 * Middleware: validateDateRange
 *
 * Validates that:
 *  - start_date and end_date are present and valid ISO dates
 *  - start_date <= end_date
 *  - The range does not exceed 3 months (≈92 days)
 *
 * Attaches { startDate, endDate } as Date objects to req.dateRange
 * after validation passes.
 */
const MAX_RANGE_DAYS = 92; // ~3 months

const validateDateRange = (req, res, next) => {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
        return res.status(400).json({
            success: false,
            message: "Both start_date and end_date query parameters are required (YYYY-MM-DD).",
        });
    }

    const startDate = new Date(start_date);
    const endDate   = new Date(end_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
            success: false,
            message: "Invalid date format. Use YYYY-MM-DD.",
        });
    }

    if (startDate > endDate) {
        return res.status(400).json({
            success: false,
            message: "start_date must be on or before end_date.",
        });
    }

    const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (diffDays > MAX_RANGE_DAYS) {
        return res.status(400).json({
            success: false,
            message: `Date range must not exceed ${MAX_RANGE_DAYS} days (3 months). Provided range: ${diffDays} days.`,
        });
    }

    req.dateRange = { startDate: start_date, endDate: end_date };
    next();
};

module.exports = { validateDateRange };