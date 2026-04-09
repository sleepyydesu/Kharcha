const supabase = require("../services/supabaseClient");

const MAX_BUDGET_DAYS = 366;

const validateBudgetPeriod = (period_start, period_end) => {
    const start = new Date(period_start);
    const end   = new Date(period_end);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return "Invalid date format. Use YYYY-MM-DD.";
    if (start > end) return "period_start must be on or before period_end.";
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (days > MAX_BUDGET_DAYS) return `Budget period cannot exceed ${MAX_BUDGET_DAYS} days.`;
    return null;
};

// ─────────────────────────────────────────────────────────────
//  GET /api/budgets?start_date=&end_date=
//  Returns budgets in range, with actual spending attached
// ─────────────────────────────────────────────────────────────
const getBudgets = async (req, res) => {
    try {
        const userId = req.account.account_id;
        const { start_date, end_date } = req.query;

        let query = supabase
            .from("budgets")
            .select("*, categories(name, icon, color)")
            .eq("user_id", userId)
            .order("period_start", { ascending: false });

        if (start_date) query = query.gte("period_start", start_date);
        if (end_date)   query = query.lte("period_end",   end_date);

        const { data: budgets, error } = await query;
        if (error) throw error;

        // Attach actual spending for each budget's period + category
        const enriched = await Promise.all(budgets.map(async (b) => {
            let expQ = supabase
                .from("expenses")
                .select("amount.sum()")
                .eq("user_id", userId)
                .gte("date", b.period_start)
                .lte("date", b.period_end);

            if (b.category_id) expQ = expQ.eq("category_id", b.category_id);

            const { data: totals } = await expQ;
            const spent = parseFloat(totals?.[0]?.sum ?? 0);
            return {
                ...b,
                spent,
                remaining: Math.max(0, b.amount - spent),
                utilization_pct: b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0,
            };
        }));

        return res.status(200).json({ success: true, data: enriched });
    } catch (err) {
        console.error("[getBudgets]", err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ─────────────────────────────────────────────────────────────
//  GET /api/budgets/:id
// ─────────────────────────────────────────────────────────────
const getBudgetById = async (req, res) => {
    try {
        const userId   = req.account.account_id;
        const budgetId = req.params.id;

        const { data, error } = await supabase
            .from("budgets")
            .select("*, categories(name, icon, color)")
            .eq("budget_id", budgetId)
            .eq("user_id", userId)
            .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, message: "Budget not found." });
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("[getBudgetById]", err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ─────────────────────────────────────────────────────────────
//  POST /api/budgets
// ─────────────────────────────────────────────────────────────
const createBudget = async (req, res) => {
    try {
        const userId = req.account.account_id;
        const { category_id, amount, period_start, period_end } = req.body;

        if (!period_start || !period_end) return res.status(400).json({ success: false, message: "period_start and period_end are required." });
        const periodErr = validateBudgetPeriod(period_start, period_end);
        if (periodErr) return res.status(400).json({ success: false, message: periodErr });

        if (amount === undefined) return res.status(400).json({ success: false, message: "amount is required." });
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) return res.status(400).json({ success: false, message: "amount must be a positive number." });

        // Validate category if provided
        if (category_id) {
            const { data: cat } = await supabase
                .from("categories")
                .select("category_id")
                .eq("category_id", category_id)
                .or(`user_id.is.null,user_id.eq.${userId}`)
                .maybeSingle();
            if (!cat) return res.status(404).json({ success: false, message: "Category not found." });
        }

        const { data, error } = await supabase
            .from("budgets")
            .insert({ user_id: userId, category_id: category_id || null, amount: parsedAmount, period_start, period_end })
            .select("*, categories(name, icon, color)")
            .single();

        if (error) {
            if (error.code === "23505") return res.status(409).json({ success: false, message: "A budget already exists for this category and period." });
            throw error;
        }
        return res.status(201).json({ success: true, data });
    } catch (err) {
        console.error("[createBudget]", err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ─────────────────────────────────────────────────────────────
//  PUT /api/budgets/:id
// ─────────────────────────────────────────────────────────────
const updateBudget = async (req, res) => {
    try {
        const userId   = req.account.account_id;
        const budgetId = req.params.id;
        const { amount, period_start, period_end, category_id } = req.body;

        const { data: existing } = await supabase
            .from("budgets")
            .select("*")
            .eq("budget_id", budgetId)
            .eq("user_id", userId)
            .maybeSingle();

        if (!existing) return res.status(404).json({ success: false, message: "Budget not found." });

        const updates = {};
        if (amount !== undefined) {
            const parsed = parseFloat(amount);
            if (isNaN(parsed) || parsed <= 0) return res.status(400).json({ success: false, message: "amount must be a positive number." });
            updates.amount = parsed;
        }
        const newStart = period_start || existing.period_start;
        const newEnd   = period_end   || existing.period_end;
        if (period_start || period_end) {
            const periodErr = validateBudgetPeriod(newStart, newEnd);
            if (periodErr) return res.status(400).json({ success: false, message: periodErr });
            updates.period_start = newStart;
            updates.period_end   = newEnd;
        }
        if (category_id !== undefined) updates.category_id = category_id;

        const { data, error } = await supabase
            .from("budgets")
            .update(updates)
            .eq("budget_id", budgetId)
            .eq("user_id", userId)
            .select("*, categories(name, icon, color)")
            .single();

        if (error) throw error;
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("[updateBudget]", err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ─────────────────────────────────────────────────────────────
//  DELETE /api/budgets/:id
// ─────────────────────────────────────────────────────────────
const deleteBudget = async (req, res) => {
    try {
        const userId   = req.account.account_id;
        const budgetId = req.params.id;

        const { data: existing } = await supabase
            .from("budgets")
            .select("budget_id")
            .eq("budget_id", budgetId)
            .eq("user_id", userId)
            .maybeSingle();

        if (!existing) return res.status(404).json({ success: false, message: "Budget not found." });

        const { error } = await supabase.from("budgets").delete().eq("budget_id", budgetId).eq("user_id", userId);
        if (error) throw error;
        return res.status(200).json({ success: true, message: "Budget deleted." });
    } catch (err) {
        console.error("[deleteBudget]", err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

module.exports = { getBudgets, getBudgetById, createBudget, updateBudget, deleteBudget };