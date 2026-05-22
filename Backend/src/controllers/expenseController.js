const supabase = require("../services/supabaseClient");

const resolveCategory = async (categoryId, userId) => {
    const { data } = await supabase
        .from("categories")
        .select("category_id")
        .eq("category_id", categoryId)
        .or(`user_id.is.null,user_id.eq.${userId}`)
        .maybeSingle();
    return data;
};

const getExpenseOverview = async (req, res) => {
    try {
        const userId = req.account.account_id;
        const { startDate, endDate } = req.dateRange;

        const { data, error } = await supabase.rpc("expense_overview", {
            p_user_id: userId,
            p_start_date: startDate,
            p_end_date: endDate,
        });

        if (error) throw error;
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("[getExpenseOverview]", err);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error." });
    }
};

const getExpensesByCategory = async (req, res) => {
    try {
        const userId = req.account.account_id;
        const categoryId = req.params.categoryId;
        const { startDate, endDate } = req.dateRange;
        const page = Math.max(1, parseInt(req.query.page || "1", 10));
        const limit = Math.min(
            100,
            Math.max(1, parseInt(req.query.limit || "20", 10)),
        );
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const validCat = await resolveCategory(categoryId, userId);
        if (!validCat) {
            return res
                .status(404)
                .json({ success: false, message: "Category not found." });
        }

        const { data, error, count } = await supabase
            .from("expenses")
            .select("*, categories(name, color, icon_url, icon_type)", {
                count: "exact",
            })
            .eq("user_id", userId)
            .eq("category_id", categoryId)
            .gte("date", startDate)
            .lte("date", endDate)
            .order("date", { ascending: false })
            .range(from, to);

        if (error) throw error;

        return res.status(200).json({
            success: true,
            data,
            pagination: {
                total: count,
                page,
                limit,
                total_pages: Math.ceil(count / limit),
            },
        });
    } catch (err) {
        console.error("[getExpensesByCategory]", err);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error." });
    }
};

const getExpenseById = async (req, res) => {
    try {
        const userId = req.account.account_id;
        const expenseId = req.params.id;

        const { data, error } = await supabase
            .from("expenses")
            .select("*, categories(name, color, icon_url, icon_type)")
            .eq("expense_id", expenseId)
            .eq("user_id", userId)
            .maybeSingle();

        if (error) throw error;
        if (!data)
            return res
                .status(404)
                .json({ success: false, message: "Expense not found." });

        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("[getExpenseById]", err);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error." });
    }
};

const createExpense = async (req, res) => {
    try {
        const userId = req.account.account_id;
        const { category_id, amount, note, date, is_auto } = req.body;


        if (!category_id)
            return res
                .status(400)
                .json({ success: false, message: "category_id is required." });
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

        const validCat = await resolveCategory(category_id, userId);
        
        if (!validCat)
            return res
                .status(404)
                .json({ success: false, message: "Category not found." });

        const expenseDate = date || new Date().toISOString().slice(0, 10);
        if (isNaN(new Date(expenseDate).getTime()))
            return res.status(400).json({
                success: false,
                message: "Invalid date format. Use YYYY-MM-DD.",
            });



        const { data, error } = await supabase
            .from("expenses")
            .insert({
                user_id: userId,
                category_id,
                amount: parsedAmount,
                note: note || null,
                date: expenseDate,
                is_auto: is_auto === true,
            })
            .select("*, categories(name, color, icon_url, icon_type)")
            .single();



        if (error) throw error;
        return res.status(201).json({ success: true, data });
    } catch (err) {
        console.error("[createExpense] FULL ERROR:", err);
        console.error("[createExpense] ERROR MESSAGE:", err.message); 
        console.error("[createExpense] ERROR STACK:", err.stack); 
        return res
            .status(500)
            .json({ success: false, message: "Internal server error." });
    }
};

const updateExpense = async (req, res) => {
    try {
        const userId = req.account.account_id;
        const expenseId = req.params.id;
        const { category_id, amount, note, date } = req.body;

        const { data: existing } = await supabase
            .from("expenses")
            .select("expense_id")
            .eq("expense_id", expenseId)
            .eq("user_id", userId)
            .maybeSingle();

        if (!existing)
            return res
                .status(404)
                .json({ success: false, message: "Expense not found." });

        const updates = {};
        if (amount !== undefined) {
            const parsed = parseFloat(amount);
            if (isNaN(parsed) || parsed <= 0)
                return res.status(400).json({
                    success: false,
                    message: "amount must be a positive number.",
                });
            updates.amount = parsed;
        }
        if (category_id !== undefined) {
            const validCat = await resolveCategory(category_id, userId);
            if (!validCat)
                return res
                    .status(404)
                    .json({ success: false, message: "Category not found." });
            updates.category_id = category_id;
        }
        if (note !== undefined) updates.note = note;
        if (date !== undefined) {
            if (isNaN(new Date(date).getTime()))
                return res.status(400).json({
                    success: false,
                    message: "Invalid date format. Use YYYY-MM-DD.",
                });
            updates.date = date;
        }

        const { data, error } = await supabase
            .from("expenses")
            .update(updates)
            .eq("expense_id", expenseId)
            .eq("user_id", userId)
            .select("*, categories(name, color, icon_url, icon_type)")
            .single();

        if (error) throw error;
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("[updateExpense]", err);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error." });
    }
};

const deleteExpense = async (req, res) => {
    try {
        const userId = req.account.account_id;
        const expenseId = req.params.id;

        const { data: existing } = await supabase
            .from("expenses")
            .select("expense_id")
            .eq("expense_id", expenseId)
            .eq("user_id", userId)
            .maybeSingle();

        if (!existing)
            return res
                .status(404)
                .json({ success: false, message: "Expense not found." });

        const { error } = await supabase
            .from("expenses")
            .delete()
            .eq("expense_id", expenseId)
            .eq("user_id", userId);
        if (error) throw error;
        return res
            .status(200)
            .json({ success: true, message: "Expense deleted." });
    } catch (err) {
        console.error("[deleteExpense]", err);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error." });
    }
};

module.exports = {
    getExpenseOverview,
    getExpensesByCategory,
    getExpenseById,
    createExpense,
    updateExpense,
    deleteExpense,
};
