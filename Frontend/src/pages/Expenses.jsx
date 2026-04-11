import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
} from "lucide-react";
import "./Expenses.css";

import {
  getExpenseOverview,
  createExpense,
  getIncome,
  createIncome,
  getBudgets,
  createBudget,
  getCategories,
} from "../services/api";

const INCOME_SOURCES = [
  "Salary",
  "Freelance",
  "Business",
  "Investments",
  "Gifts",
  "Others",
];
const PIE_COLORS = [
  "#1e5c38",
  "#2e7d55",
  "#4caf50",
  "#81c784",
  "#a5d6a7",
  "#c8e6c9",
  "#e8f5e9",
  "#388e3c",
  "#66bb6a",
];

const todayStr = () => new Date().toISOString().split("T")[0];
const fmt = (d) => d.toISOString().split("T")[0];

function getDateRange(filter) {
  const now = new Date();
  if (filter === "today") {
    const t = todayStr();
    return { start: t, end: t };
  }
  if (filter === "90days") {
    const s = new Date(now);
    s.setDate(s.getDate() - 90);
    return { start: fmt(s), end: todayStr() };
  }
  if (filter === "thismonth") {
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: fmt(s), end: todayStr() };
  }
  return null;
}

export default function Expenses() {
  const [overview, setOverview] = useState([]);
  const [incomeList, setIncomeList] = useState([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dateFilter, setDateFilter] = useState("thismonth");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterCat, setFilterCat] = useState("All");

  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [apiErr, setApiErr] = useState("");

  const [expForm, setExpForm] = useState({
    category_id: "",
    amount: "",
    note: "",
    date: todayStr(),
  });
  const [incForm, setIncForm] = useState({
    amount: "",
    source: "Salary",
    note: "",
    date: todayStr(),
  });
  const [budForm, setBudForm] = useState({
    category_id: "",
    amount: "",
    period_start: todayStr(),
    period_end: todayStr(),
  });

  const range =
    dateFilter === "custom"
      ? { start: customStart, end: customEnd }
      : getDateRange(dateFilter);

  const fetchAll = useCallback(async () => {
    if (!range?.start || !range?.end) return;
    setLoading(true);
    try {
      const [ov, inc, bud, cats] = await Promise.all([
        getExpenseOverview(range.start, range.end),
        getIncome(range.start, range.end),
        getBudgets(range.start, range.end),
        getCategories(),
      ]);
      setOverview(ov.data || ov || []);

      const incomeArr = inc.data || [];
      setIncomeList(incomeArr);
      // ✅ FIXED: calculate total from actual list instead of relying on field name
      setTotalIncome(
        incomeArr.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0),
      );

      setBudgets(bud.data || bud || []);
      setCategories(cats.data || cats.categories || cats || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [range?.start, range?.end]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const totalExpenses = overview.reduce(
    (s, c) => s + parseFloat(c.total_amount || 0),
    0,
  );
  const netSavings = totalIncome - totalExpenses;

  const expEntries = overview.flatMap((cat) =>
    Array(parseInt(cat.expense_count || 0))
      .fill(null)
      .map((_, i) => ({
        id: `${cat.category_id}-${i}`,
        type: "expense",
        category: cat.category_name,
        amount:
          parseFloat(cat.total_amount || 0) / parseInt(cat.expense_count || 1),
        time: range?.end || todayStr(),
      })),
  );

  const incEntries = incomeList.map((inc) => ({
    id: inc.income_id,
    type: "income",
    category: inc.source || "Income",
    amount: parseFloat(inc.amount),
    time: inc.date,
    note: inc.note,
  }));

  const allEntries = [...expEntries, ...incEntries]
    .filter((e) => filterType === "All" || e.type === filterType)
    .filter((e) => filterCat === "All" || e.category === filterCat);

  const allCats = [
    ...new Set([...expEntries, ...incEntries].map((e) => e.category)),
  ];

  const barData = [
    { name: "Period", Income: totalIncome, Expenses: totalExpenses },
  ];
  const pieData = overview
    .filter((c) => parseFloat(c.total_amount) > 0)
    .map((c) => ({ name: c.category_name, value: parseFloat(c.total_amount) }));

  const handleAddExpense = async () => {
    setApiErr("");
    if (!expForm.category_id || !expForm.amount) {
      setApiErr("Category and amount are required.");
      return;
    }
    setSaving(true);
    try {
      await createExpense({
        category_id: expForm.category_id,
        amount: parseFloat(expForm.amount),
        note: expForm.note || null,
        date: expForm.date,
      });
      setModal(null);
      setExpForm({ category_id: "", amount: "", note: "", date: todayStr() });
      fetchAll();
    } catch (e) {
      setApiErr(e.message || "Failed to add expense.");
    }
    setSaving(false);
  };

  const handleAddIncome = async () => {
    setApiErr("");
    if (!incForm.amount) {
      setApiErr("Amount is required.");
      return;
    }
    setSaving(true);
    try {
      await createIncome({
        amount: parseFloat(incForm.amount),
        source: incForm.source,
        note: incForm.note || null,
        date: incForm.date,
      });
      setModal(null);
      setIncForm({ amount: "", source: "Salary", note: "", date: todayStr() });
      fetchAll();
    } catch (e) {
      setApiErr(e.message || "Failed to add income.");
    }
    setSaving(false);
  };

  const handleSetBudget = async () => {
    setApiErr("");
    if (!budForm.amount || !budForm.period_start || !budForm.period_end) {
      setApiErr("Amount and period dates are required.");
      return;
    }
    setSaving(true);
    try {
      await createBudget({
        category_id: budForm.category_id || null,
        amount: parseFloat(budForm.amount),
        period_start: budForm.period_start,
        period_end: budForm.period_end,
      });
      setModal(null);
      setBudForm({
        category_id: "",
        amount: "",
        period_start: todayStr(),
        period_end: todayStr(),
      });
      fetchAll();
    } catch (e) {
      setApiErr(e.message || "Failed to set budget.");
    }
    setSaving(false);
  };

  const openModal = (type) => {
    setApiErr("");
    setModal(type);
  };

  return (
    <div className="expenses-page">
      {/* ── HEADER ── */}
      <div className="exp-header">
        <div>
          <h2 className="exp-title">Expenses</h2>
          <p className="exp-sub">Track your income & spending</p>
        </div>
        <div className="exp-header-btns">
          <button
            className="exp-btn income"
            onClick={() => openModal("income")}
          >
            <Plus size={16} /> Income
          </button>
          <button
            className="exp-btn expense"
            onClick={() => openModal("expense")}
          >
            <Plus size={16} /> Expense
          </button>
          <button
            className="exp-btn budget"
            onClick={() => openModal("budget")}
          >
            <Target size={16} /> Budget
          </button>
        </div>
      </div>

      {/* ── DATE FILTERS ── */}
      <div className="exp-filters">
        {["today", "thismonth", "90days", "custom"].map((f) => (
          <button
            key={f}
            className={`exp-filter-btn ${dateFilter === f ? "active" : ""}`}
            onClick={() => setDateFilter(f)}
          >
            {f === "today"
              ? "Today"
              : f === "thismonth"
                ? "This Month"
                : f === "90days"
                  ? "90 Days"
                  : "Custom"}
          </button>
        ))}
      </div>

      {dateFilter === "custom" && (
        <div className="exp-custom-range">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="exp-date-input"
          />
          <span>to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="exp-date-input"
          />
        </div>
      )}

      {/* ── SUMMARY CARDS ── */}
      <div className="exp-summary-grid">
        <div className="exp-summary-card income-card">
          <div className="exp-summary-icon">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="exp-summary-label">Total Income</p>
            <p className="exp-summary-amount">
              NPR {totalIncome.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="exp-summary-card expense-card">
          <div className="exp-summary-icon">
            <TrendingDown size={20} />
          </div>
          <div>
            <p className="exp-summary-label">Total Expenses</p>
            <p className="exp-summary-amount">
              NPR {totalExpenses.toLocaleString()}
            </p>
          </div>
        </div>
        <div
          className={`exp-summary-card savings-card ${netSavings < 0 ? "negative" : ""}`}
        >
          <div className="exp-summary-icon">
            <Wallet size={20} />
          </div>
          <div>
            <p className="exp-summary-label">Net Savings</p>
            <p className="exp-summary-amount">
              NPR {netSavings.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* ── BUDGETS ── */}
      {budgets.length > 0 && (
        <div className="exp-budget-section">
          <h3 className="exp-section-heading">Budgets</h3>
          {budgets.map((b) => (
            <div key={b.budget_id} className="exp-budget-card">
              <div className="exp-budget-top">
                <div>
                  <p className="exp-budget-name">
                    {b.categories?.name || "Overall"}
                  </p>
                  <p className="exp-budget-meta">
                    NPR {parseFloat(b.spent || 0).toLocaleString()} of NPR{" "}
                    {parseFloat(b.amount).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`exp-budget-pct ${b.utilization_pct >= 90 ? "danger" : b.utilization_pct >= 70 ? "warn" : ""}`}
                >
                  {b.utilization_pct}%
                </span>
              </div>
              <div className="exp-budget-bar-bg">
                <div
                  className="exp-budget-bar-fill"
                  style={{
                    width: `${Math.min(b.utilization_pct, 100)}%`,
                    background:
                      b.utilization_pct >= 90
                        ? "#ef4444"
                        : b.utilization_pct >= 70
                          ? "#f59e0b"
                          : "#1e5c38",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CHARTS ── */}
      {!loading && (totalIncome > 0 || totalExpenses > 0) && (
        <div className="exp-charts-grid">
          <div className="exp-chart-card">
            <h3 className="exp-chart-title">Income vs Expenses</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `NPR ${v.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="Income" fill="#1e5c38" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {pieData.length > 0 && (
            <div className="exp-chart-card">
              <h3 className="exp-chart-title">Spending by Category</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `NPR ${v.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── ENTRIES LIST ── */}
      <div className="exp-list-section">
        <div className="exp-list-header">
          <h3>Entries</h3>
          <div className="exp-list-filters">
            <select
              className="exp-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <select
              className="exp-select"
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
            >
              <option value="All">All Categories</option>
              {allCats.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p
            className="exp-empty"
            style={{ textAlign: "center", padding: "20px" }}
          >
            Loading...
          </p>
        ) : allEntries.length === 0 ? (
          <div className="exp-empty">
            <p>No entries yet. Add income or expense to get started.</p>
          </div>
        ) : (
          <div className="exp-list">
            {allEntries.map((entry) => (
              <div key={entry.id} className={`exp-item ${entry.type}`}>
                <div className="exp-item-left">
                  <div className={`exp-item-dot ${entry.type}`} />
                  <div>
                    <p className="exp-item-cat">{entry.category}</p>
                    <p className="exp-item-meta">
                      {entry.time}
                      {entry.note ? ` · ${entry.note}` : ""}
                    </p>
                  </div>
                </div>
                <div className="exp-item-right">
                  <span className={`exp-item-amount ${entry.type}`}>
                    {entry.type === "income" ? "+" : "-"} NPR{" "}
                    {entry.amount.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      {modal && (
        <div className="exp-modal-overlay" onClick={() => setModal(null)}>
          <div className="exp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="exp-modal-header">
              <div className="exp-modal-tabs">
                <button
                  className={modal === "income" ? "active" : ""}
                  onClick={() => openModal("income")}
                >
                  Income
                </button>
                <button
                  className={modal === "expense" ? "active" : ""}
                  onClick={() => openModal("expense")}
                >
                  Expense
                </button>
                <button
                  className={modal === "budget" ? "active" : ""}
                  onClick={() => openModal("budget")}
                >
                  Budget
                </button>
              </div>
              <button
                className="exp-modal-close"
                onClick={() => setModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            {apiErr && <p className="exp-modal-err">{apiErr}</p>}

            {/* EXPENSE FORM */}
            {modal === "expense" && (
              <div className="exp-modal-body">
                <div className="exp-form-group">
                  <label>Category *</label>
                  <select
                    value={expForm.category_id}
                    onChange={(e) =>
                      setExpForm({ ...expForm, category_id: e.target.value })
                    }
                    className="exp-input"
                  >
                    <option value="">Select category</option>
                    {/* ✅ FIXED: only real categories, no hardcoded fallback */}
                    {categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="exp-form-group">
                  <label>Amount (NPR) *</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={expForm.amount}
                    onChange={(e) =>
                      setExpForm({ ...expForm, amount: e.target.value })
                    }
                    className="exp-input"
                  />
                </div>
                <div className="exp-form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    value={expForm.date}
                    onChange={(e) =>
                      setExpForm({ ...expForm, date: e.target.value })
                    }
                    className="exp-input"
                  />
                </div>
                <div className="exp-form-group">
                  <label>Note (optional)</label>
                  <input
                    type="text"
                    placeholder="Add a note..."
                    value={expForm.note}
                    onChange={(e) =>
                      setExpForm({ ...expForm, note: e.target.value })
                    }
                    className="exp-input"
                    maxLength={100}
                  />
                </div>
                <button
                  className="exp-submit-btn expense"
                  onClick={handleAddExpense}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Add Expense"}
                </button>
              </div>
            )}

            {/* INCOME FORM */}
            {modal === "income" && (
              <div className="exp-modal-body">
                <div className="exp-form-group">
                  <label>Source *</label>
                  <select
                    value={incForm.source}
                    onChange={(e) =>
                      setIncForm({ ...incForm, source: e.target.value })
                    }
                    className="exp-input"
                  >
                    {INCOME_SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="exp-form-group">
                  <label>Amount (NPR) *</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={incForm.amount}
                    onChange={(e) =>
                      setIncForm({ ...incForm, amount: e.target.value })
                    }
                    className="exp-input"
                  />
                </div>
                <div className="exp-form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    value={incForm.date}
                    onChange={(e) =>
                      setIncForm({ ...incForm, date: e.target.value })
                    }
                    className="exp-input"
                  />
                </div>
                <div className="exp-form-group">
                  <label>Note (optional)</label>
                  <input
                    type="text"
                    placeholder="Add a note..."
                    value={incForm.note}
                    onChange={(e) =>
                      setIncForm({ ...incForm, note: e.target.value })
                    }
                    className="exp-input"
                    maxLength={100}
                  />
                </div>
                <button
                  className="exp-submit-btn income"
                  onClick={handleAddIncome}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Add Income"}
                </button>
              </div>
            )}

            {/* BUDGET FORM */}
            {modal === "budget" && (
              <div className="exp-modal-body">
                <div className="exp-form-group">
                  <label>Category (leave empty for overall budget)</label>
                  <select
                    value={budForm.category_id}
                    onChange={(e) =>
                      setBudForm({ ...budForm, category_id: e.target.value })
                    }
                    className="exp-input"
                  >
                    <option value="">Overall Budget</option>
                    {/* ✅ FIXED: only real categories, no hardcoded fallback */}
                    {categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="exp-form-group">
                  <label>Budget Amount (NPR) *</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={budForm.amount}
                    onChange={(e) =>
                      setBudForm({ ...budForm, amount: e.target.value })
                    }
                    className="exp-input"
                  />
                </div>
                <div className="exp-form-group">
                  <label>Period Start *</label>
                  <input
                    type="date"
                    value={budForm.period_start}
                    onChange={(e) =>
                      setBudForm({ ...budForm, period_start: e.target.value })
                    }
                    className="exp-input"
                  />
                </div>
                <div className="exp-form-group">
                  <label>Period End *</label>
                  <input
                    type="date"
                    value={budForm.period_end}
                    onChange={(e) =>
                      setBudForm({ ...budForm, period_end: e.target.value })
                    }
                    className="exp-input"
                  />
                </div>
                <button
                  className="exp-submit-btn budget"
                  onClick={handleSetBudget}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Set Budget"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
