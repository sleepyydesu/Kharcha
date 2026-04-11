import React, { useState, useEffect } from "react";

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
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import {
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  Wallet,
  ChevronDown,
} from "lucide-react";

import "./Expenses.css";

// ─── CONSTANTS ────────────────────────────────────────────────
const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Business",
  "Investments",
  "Gifts",
  "Others",
];
const EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Transport",
  "Utilities",
  "Shopping",
  "Health",
  "Education",
  "Entertainment",
  "Housing",
  "Others",
];
const PAYMENT_METHODS = ["Kharcha Wallet", "Cash", "Bank Transfer", "Card"];
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

const today = () => new Date().toISOString().split("T")[0];
const monthKey = (dateStr) =>
  new Date(dateStr).toLocaleString("default", {
    month: "short",
    year: "2-digit",
  });

function getDateRange(filter) {
  const now = new Date();
  if (filter === "today") {
    const t = today();
    return { start: t, end: t };
  }
  if (filter === "90days") {
    const start = new Date(now);
    start.setDate(start.getDate() - 90);
    return { start: start.toISOString().split("T")[0], end: today() };
  }
  if (filter === "thismonth") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: start.toISOString().split("T")[0], end: today() };
  }
  return null; // custom
}

// ─── MAIN COMPONENT ───────────────────────────────────────────
export default function Expenses() {
  const [entries, setEntries] = useState(() => {
    const saved = localStorage.getItem("kharcha_expenses");
    return saved ? JSON.parse(saved) : [];
  });
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("expense"); // "income" | "expense"
  const [dateFilter, setDateFilter] = useState("thismonth");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterType, setFilterType] = useState("All");

  // Form state
  const [form, setForm] = useState({
    amount: "",
    date: today(),
    category: "",
    paymentMethod: "Kharcha Wallet",
    remarks: "",
  });

  // Save to localStorage whenever entries change
  useEffect(() => {
    localStorage.setItem("kharcha_expenses", JSON.stringify(entries));
  }, [entries]);

  // Auto-pull wallet transactions as [Auto] entries
  useEffect(() => {
    const autoSync = async () => {
      try {
        const txns = await getTransactions();
        const autoEntries = txns.map((t) => ({
          id: "auto_" + t.transaction_id,
          type: t.type === "received" ? "income" : "expense",
          amount: parseFloat(t.amount),
          date: t.created_at.split("T")[0],
          category: t.type === "received" ? "Others" : "Others",
          paymentMethod: "Kharcha Wallet",
          remarks: t.counterparty?.display_name || "",
          auto: true,
          excluded: false,
        }));
        setEntries((prev) => {
          const manualIds = new Set(
            prev.filter((e) => !e.auto).map((e) => e.id),
          );
          const existingAutoIds = new Set(
            prev.filter((e) => e.auto).map((e) => e.id),
          );
          const newAuto = autoEntries.filter((e) => !existingAutoIds.has(e.id));
          return [
            ...prev.filter((e) => !e.auto || existingAutoIds.has(e.id)),
            ...newAuto,
          ];
        });
      } catch (_) {}
    };
    autoSync();
  }, []);

  // ── Filter entries ──────────────────────────────────────────
  const filteredEntries = entries.filter((e) => {
    if (e.excluded) return false;
    let inRange = true;
    const range =
      dateFilter === "custom"
        ? { start: customStart, end: customEnd }
        : getDateRange(dateFilter);
    if (range && range.start && range.end) {
      inRange = e.date >= range.start && e.date <= range.end;
    }
    const inCat = filterCategory === "All" || e.category === filterCategory;
    const inType = filterType === "All" || e.type === filterType;
    return inRange && inCat && inType;
  });

  // ── Summary ─────────────────────────────────────────────────
  const totalIncome = filteredEntries
    .filter((e) => e.type === "income")
    .reduce((s, e) => s + e.amount, 0);
  const totalExpense = filteredEntries
    .filter((e) => e.type === "expense")
    .reduce((s, e) => s + e.amount, 0);
  const netSavings = totalIncome - totalExpense;

  // ── Bar chart data (monthly) ─────────────────────────────────
  const barMap = {};
  filteredEntries.forEach((e) => {
    const k = monthKey(e.date);
    if (!barMap[k]) barMap[k] = { month: k, Income: 0, Expenses: 0 };
    if (e.type === "income") barMap[k].Income += e.amount;
    else barMap[k].Expenses += e.amount;
  });
  const barData = Object.values(barMap).slice(-6);

  // ── Line chart data ──────────────────────────────────────────
  const lineMap = {};
  filteredEntries
    .filter((e) => e.type === "expense")
    .forEach((e) => {
      const k = e.date;
      lineMap[k] = (lineMap[k] || 0) + e.amount;
    });
  const lineData = Object.entries(lineMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, amount]) => ({ date: date.slice(5), amount }));

  // ── Pie chart data ────────────────────────────────────────────
  const pieMap = {};
  filteredEntries
    .filter((e) => e.type === "expense")
    .forEach((e) => {
      pieMap[e.category] = (pieMap[e.category] || 0) + e.amount;
    });
  const pieData = Object.entries(pieMap).map(([name, value]) => ({
    name,
    value,
  }));

  // ── Add entry ────────────────────────────────────────────────
  const handleAdd = () => {
    if (!form.amount || !form.date || !form.category) {
      alert("Please fill all required fields");
      return;
    }
    const newEntry = {
      id: Date.now().toString(),
      type: modalType,
      amount: parseFloat(form.amount),
      date: form.date,
      category: form.category,
      paymentMethod: form.paymentMethod,
      remarks: form.remarks,
      auto: false,
      excluded: false,
    };
    setEntries((prev) => [newEntry, ...prev]);
    setForm({
      amount: "",
      date: today(),
      category: "",
      paymentMethod: "Kharcha Wallet",
      remarks: "",
    });
    setShowModal(false);
  };

  const toggleExclude = (id) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, excluded: !e.excluded } : e)),
    );
  };

  const openModal = (type) => {
    setModalType(type);
    setForm({
      amount: "",
      date: today(),
      category: "",
      paymentMethod: "Kharcha Wallet",
      remarks: "",
    });
    setShowModal(true);
  };

  const allCategories = [...new Set(entries.map((e) => e.category))];

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
              NPR {totalExpense.toLocaleString()}
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

      {/* ── CHARTS ── */}
      {barData.length > 0 && (
        <div className="exp-charts-grid">
          {/* Bar Chart */}
          <div className="exp-chart-card">
            <h3 className="exp-chart-title">Income vs Expenses</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `NPR ${v.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="Income" fill="#1e5c38" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
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

      {/* Line Chart */}
      {lineData.length > 1 && (
        <div className="exp-chart-card full-width">
          <h3 className="exp-chart-title">Spending Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `NPR ${v.toLocaleString()}`} />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#1e5c38"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── TRANSACTION LIST ── */}
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
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="exp-empty">
            <p>No entries yet. Add income or expense to get started.</p>
          </div>
        ) : (
          <div className="exp-list">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className={`exp-item ${entry.type}`}>
                <div className="exp-item-left">
                  <div className={`exp-item-dot ${entry.type}`} />
                  <div>
                    <p className="exp-item-cat">
                      {entry.category}
                      {entry.auto && (
                        <span className="exp-auto-tag">[Auto]</span>
                      )}
                    </p>
                    <p className="exp-item-meta">
                      {entry.date} · {entry.paymentMethod}
                      {entry.remarks ? ` · ${entry.remarks}` : ""}
                    </p>
                  </div>
                </div>
                <div className="exp-item-right">
                  <span className={`exp-item-amount ${entry.type}`}>
                    {entry.type === "income" ? "+" : "-"} NPR{" "}
                    {entry.amount.toLocaleString()}
                  </span>
                  {entry.auto && (
                    <button
                      className="exp-exclude-btn"
                      onClick={() => toggleExclude(entry.id)}
                    >
                      Exclude
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── ADD MODAL ── */}
      {showModal && (
        <div className="exp-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="exp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="exp-modal-header">
              <div className="exp-modal-tabs">
                <button
                  className={modalType === "income" ? "active" : ""}
                  onClick={() => setModalType("income")}
                >
                  Income
                </button>
                <button
                  className={modalType === "expense" ? "active" : ""}
                  onClick={() => setModalType("expense")}
                >
                  Expense
                </button>
              </div>
              <button
                className="exp-modal-close"
                onClick={() => setShowModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="exp-modal-body">
              <div className="exp-form-group">
                <label>Amount (NPR) *</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="exp-input"
                />
              </div>

              <div className="exp-form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="exp-input"
                />
              </div>

              <div className="exp-form-group">
                <label>Category *</label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="exp-input"
                >
                  <option value="">Select category</option>
                  {(modalType === "income"
                    ? INCOME_CATEGORIES
                    : EXPENSE_CATEGORIES
                  ).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {modalType === "expense" && (
                <div className="exp-form-group">
                  <label>Payment Method</label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) =>
                      setForm({ ...form, paymentMethod: e.target.value })
                    }
                    className="exp-input"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="exp-form-group">
                <label>Remarks (optional)</label>
                <input
                  type="text"
                  placeholder="Add a note..."
                  value={form.remarks}
                  onChange={(e) =>
                    setForm({ ...form, remarks: e.target.value })
                  }
                  className="exp-input"
                  maxLength={100}
                />
              </div>

              <button
                className={`exp-submit-btn ${modalType}`}
                onClick={handleAdd}
              >
                Add {modalType === "income" ? "Income" : "Expense"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
