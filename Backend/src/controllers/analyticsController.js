const supabase = require("../services/supabaseClient");

// ─────────────────────────────────────────────────────────────
//  GET /api/analytics/pie?start_date=&end_date=
//  Pie chart: expense distribution by category
// ─────────────────────────────────────────────────────────────
const getPieChart = async (req, res) => {
    try {
        const userId = req.account.account_id;
        const { startDate, endDate } = req.dateRange;

        const { data: expenses, error } = await supabase
            .from("expenses")
            .select("amount, categories(category_id, name, color)")
            .eq("user_id", userId)
            .gte("date", startDate)
            .lte("date", endDate);

        if (error) throw error;

        // Aggregate in JS (keeps RPC-free)
        const map = {};
        for (const e of expenses) {
            const cat = e.categories;
            if (!map[cat.category_id]) map[cat.category_id] = { category_id: cat.category_id, name: cat.name, color: cat.color, total: 0 };
            map[cat.category_id].total += parseFloat(e.amount);
        }

        const grandTotal = Object.values(map).reduce((s, c) => s + c.total, 0);
        const data = Object.values(map)
            .sort((a, b) => b.total - a.total)
            .map(c => ({ ...c, total: +c.total.toFixed(2), percentage: grandTotal > 0 ? +(c.total / grandTotal * 100).toFixed(1) : 0 }));

        return res.status(200).json({ success: true, data, grand_total: +grandTotal.toFixed(2) });
    } catch (err) {
        console.error("[getPieChart]", err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ─────────────────────────────────────────────────────────────
//  GET /api/analytics/bar?start_date=&end_date=
//  Bar chart: total expenses grouped by month
// ─────────────────────────────────────────────────────────────
const getBarChart = async (req, res) => {
    try {
        const userId = req.account.account_id;
        const { startDate, endDate } = req.dateRange;

        const { data: expenses, error } = await supabase
            .from("expenses")
            .select("amount, date")
            .eq("user_id", userId)
            .gte("date", startDate)
            .lte("date", endDate);

        if (error) throw error;

        const map = {};
        for (const e of expenses) {
            const month = e.date.slice(0, 7); // "YYYY-MM"
            map[month] = (map[month] || 0) + parseFloat(e.amount);
        }

        const data = Object.keys(map).sort().map(month => ({
            month,
            label: new Date(month + "-01").toLocaleString("default", { month: "short", year: "numeric" }),
            total: +map[month].toFixed(2),
        }));

        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("[getBarChart]", err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ─────────────────────────────────────────────────────────────
//  GET /api/analytics/line?start_date=&end_date=
//  Line chart: daily expense trend over time
// ─────────────────────────────────────────────────────────────
const getLineChart = async (req, res) => {
    try {
        const userId = req.account.account_id;
        const { startDate, endDate } = req.dateRange;

        const { data: expenses, error } = await supabase
            .from("expenses")
            .select("amount, date")
            .eq("user_id", userId)
            .gte("date", startDate)
            .lte("date", endDate)
            .order("date");

        if (error) throw error;

        const map = {};
        for (const e of expenses) {
            map[e.date] = (map[e.date] || 0) + parseFloat(e.amount);
        }

        const data = Object.keys(map).sort().map(date => ({
            date,
            total: +map[date].toFixed(2),
        }));

        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("[getLineChart]", err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ─────────────────────────────────────────────────────────────
//  GET /api/analytics/income-vs-expense?start_date=&end_date=
//  Income vs Expense comparison (by month)
// ─────────────────────────────────────────────────────────────
const getIncomeVsExpense = async (req, res) => {
    try {
        const userId = req.account.account_id;
        const { startDate, endDate } = req.dateRange;

        const [{ data: expenses, error: eErr }, { data: incomes, error: iErr }] = await Promise.all([
            supabase.from("expenses").select("amount, date").eq("user_id", userId).gte("date", startDate).lte("date", endDate),
            supabase.from("income").select("amount, date").eq("user_id", userId).gte("date", startDate).lte("date", endDate),
        ]);

        if (eErr) throw eErr;
        if (iErr) throw iErr;

        const expMap = {};
        for (const e of expenses) {
            const m = e.date.slice(0, 7);
            expMap[m] = (expMap[m] || 0) + parseFloat(e.amount);
        }

        const incMap = {};
        for (const i of incomes) {
            const m = i.date.slice(0, 7);
            incMap[m] = (incMap[m] || 0) + parseFloat(i.amount);
        }

        const months = [...new Set([...Object.keys(expMap), ...Object.keys(incMap)])].sort();
        const data = months.map(month => {
            const expense = +(expMap[month] || 0).toFixed(2);
            const income  = +(incMap[month] || 0).toFixed(2);
            return {
                month,
                label: new Date(month + "-01").toLocaleString("default", { month: "short", year: "numeric" }),
                income,
                expense,
                net: +(income - expense).toFixed(2),
            };
        });

        const totalIncome  = data.reduce((s, m) => s + m.income,  0);
        const totalExpense = data.reduce((s, m) => s + m.expense, 0);

        return res.status(200).json({
            success: true,
            data,
            summary: {
                total_income:  +totalIncome.toFixed(2),
                total_expense: +totalExpense.toFixed(2),
                net:           +(totalIncome - totalExpense).toFixed(2),
            },
        });
    } catch (err) {
        console.error("[getIncomeVsExpense]", err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

module.exports = { getPieChart, getBarChart, getLineChart, getIncomeVsExpense };