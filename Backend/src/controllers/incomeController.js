const supabase = require("../services/supabaseClient");

// ─────────────────────────────────────────────────────────────
//  GET /api/income?start_date=&end_date=&page=&limit=
// ─────────────────────────────────────────────────────────────
const getIncome = async (req, res) => {
    try {
        const userId = req.account.account_id;
        const { startDate, endDate } = req.dateRange;
        const page = Math.max(1, parseInt(req.query.page || "1", 10));
        const limit = Math.min(
            100,
            Math.max(1, parseInt(req.query.limit || "20", 10)),
        );
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error, count } = await supabase
            .from("income")
            .select("*", { count: "exact" })
            .eq("user_id", userId)
            .gte("date", startDate)
            .lte("date", endDate)
            .order("date", { ascending: false })
            .range(from, to);

        if (error) throw error;

        // Aggregate total for the range
        const { data: totals } = await supabase
            .from("income")
            .select("amount.sum()")
            .eq("user_id", userId)
            .gte("date", startDate)
            .lte("date", endDate);

        return res.status(200).json({
            success: true,
            data,
            total_income: totals?.[0]?.sum ?? 0,
            pagination: {
                total: count,
                page,
                limit,
                total_pages: Math.ceil(count / limit),
            },
        });
    } catch (err) {
        console.error("[getIncome]", err);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error." });
    }
};

// ─────────────────────────────────────────────────────────────
//  GET /api/income/:id
// ─────────────────────────────────────────────────────────────
const getIncomeById = async (req, res) => {
    try {
        const userId = req.account.account_id;
        const incomeId = req.params.id;

        const { data, error } = await supabase
            .from("income")
            .select("*")
            .eq("income_id", incomeId)
            .eq("user_id", userId)
            .maybeSingle();

        if (error) throw error;
        if (!data)
            return res
                .status(404)
                .json({ success: false, message: "Income record not found." });

        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("[getIncomeById]", err);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error." });
    }
};

// ─────────────────────────────────────────────────────────────
//  POST /api/income
// ─────────────────────────────────────────────────────────────
const createIncome = async (req, res) => {
    try {
        const userId = req.account.account_id;
        const { amount, source, note, date } = req.body;

        if (amount === undefined || amount === null)
            return res
                .status(400)
                .json({ success: false, message: "amount is required." });
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0)
            return res
                .status(400)
                .json({
                    success: false,
                    message: "amount must be a positive number.",
                });
        if (source && source.length > 120)
            return res
                .status(400)
                .json({
                    success: false,
                    message: "source must be 120 characters or fewer.",
                });

        const incomeDate = date || new Date().toISOString().slice(0, 10);
        if (isNaN(new Date(incomeDate).getTime()))
            return res
                .status(400)
                .json({
                    success: false,
                    message: "Invalid date format. Use YYYY-MM-DD.",
                });

        const { data, error } = await supabase
            .from("income")
            .insert({
                user_id: userId,
                amount: parsedAmount,
                source: source || null,
                note: note || null,
                date: incomeDate,
            })
            .select()
            .single();

        if (error) throw error;
        return res.status(201).json({ success: true, data });
    } catch (err) {
        console.error("[createIncome]", err);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error." });
    }
};

// ─────────────────────────────────────────────────────────────
//  PUT /api/income/:id
// ─────────────────────────────────────────────────────────────
const updateIncome = async (req, res) => {
    try {
        const userId = req.account.account_id;
        const incomeId = req.params.id;
        const { amount, source, note, date } = req.body;

        const { data: existing } = await supabase
            .from("income")
            .select("income_id")
            .eq("income_id", incomeId)
            .eq("user_id", userId)
            .maybeSingle();

        if (!existing)
            return res
                .status(404)
                .json({ success: false, message: "Income record not found." });

        const updates = {};
        if (amount !== undefined) {
            const parsed = parseFloat(amount);
            if (isNaN(parsed) || parsed <= 0)
                return res
                    .status(400)
                    .json({
                        success: false,
                        message: "amount must be a positive number.",
                    });
            updates.amount = parsed;
        }
        if (source !== undefined) {
            if (source.length > 120)
                return res
                    .status(400)
                    .json({
                        success: false,
                        message: "source must be 120 characters or fewer.",
                    });
            updates.source = source;
        }
        if (note !== undefined) updates.note = note;
        if (date !== undefined) {
            if (isNaN(new Date(date).getTime()))
                return res
                    .status(400)
                    .json({
                        success: false,
                        message: "Invalid date format. Use YYYY-MM-DD.",
                    });
            updates.date = date;
        }

        const { data, error } = await supabase
            .from("income")
            .update(updates)
            .eq("income_id", incomeId)
            .eq("user_id", userId)
            .select()
            .single();

        if (error) throw error;
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("[updateIncome]", err);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error." });
    }
};

// ─────────────────────────────────────────────────────────────
//  DELETE /api/income/:id
// ─────────────────────────────────────────────────────────────
const deleteIncome = async (req, res) => {
    try {
        const userId = req.account.account_id;
        const incomeId = req.params.id;

        const { data: existing } = await supabase
            .from("income")
            .select("income_id")
            .eq("income_id", incomeId)
            .eq("user_id", userId)
            .maybeSingle();

        if (!existing)
            return res
                .status(404)
                .json({ success: false, message: "Income record not found." });

        const { error } = await supabase
            .from("income")
            .delete()
            .eq("income_id", incomeId)
            .eq("user_id", userId);
        if (error) throw error;
        return res
            .status(200)
            .json({ success: true, message: "Income record deleted." });
    } catch (err) {
        console.error("[deleteIncome]", err);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error." });
    }
};

module.exports = {
    getIncome,
    getIncomeById,
    createIncome,
    updateIncome,
    deleteIncome,
};
