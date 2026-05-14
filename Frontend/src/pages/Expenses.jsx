import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import {
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  ChevronRight,
  ChevronLeft,
  Pencil,
  Trash2,
  Briefcase,
  Building2,
  Gift,
  MoreHorizontal,
  DollarSign,
  Zap,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  AlertTriangle,
  BarChart2,
  Calendar,
  Download,
} from "lucide-react";
import "./Expenses.css";
import CategoryIcon from "../components/CategoryIcon";
import {
  getExpenseOverview,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpensesByCategory,
  getIncome,
  createIncome,
  updateIncome,
  deleteIncome,
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  getCategories,
} from "../services/api";

const INCOME_SOURCES = [
  "Salary",
  "Freelance",
  "Business",
  "Investments",
  "Gifts",
  "Transfer",
  "Others",
];

const CAT_COLORS = [
  "#1e5c38",
  "#2e7d55",
  "#4caf50",
  "#81c784",
  "#388e3c",
  "#66bb6a",
  "#a5d6a7",
  "#0d7c4a",
  "#27ae60",
  "#52c98c",
];

const INCOME_SOURCE_CONFIG = {
  Salary: { icon: DollarSign, bg: "#dbeafe", color: "#2563eb" },
  Freelance: { icon: Briefcase, bg: "#fce7f3", color: "#db2777" },
  Business: { icon: Building2, bg: "#fef3c7", color: "#d97706" },
  Investments: { icon: BarChart2, bg: "#ede9fe", color: "#7c3aed" },
  Gifts: { icon: Gift, bg: "#fee2e2", color: "#dc2626" },
  Transfer: { icon: Wallet, bg: "#d1fae5", color: "#059669" },
  Others: { icon: MoreHorizontal, bg: "#f1f5f9", color: "#475569" },
};

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

function getDaysBetween(start, end) {
  if (!start || !end) return 1;
  const diff = (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24);
  return Math.max(1, Math.round(diff) + 1);
}

function AutoBadge() {
  return (
    <span className="auto-badge">
      <Zap size={8} /> Auto
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-line short" />
      <div className="skeleton-line" />
    </div>
  );
}

/* ── Hero Panel ───────────────────────────────────────────── */
function HeroPanel({ totalIncome, totalExpenses, netSavings, range }) {
  const savingsRate =
    totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
  const days = getDaysBetween(range?.start, range?.end);
  const avgDaily = Math.round(totalExpenses / days);
  const isNeg = netSavings < 0;

  return (
    <div className="hero-panel">
      <div className="hero-net">
        <span className="hero-net-label">Net Position</span>
        <span className={`hero-net-amount ${isNeg ? "negative" : "positive"}`}>
          {isNeg ? "−" : "+"}NPR {Math.abs(netSavings).toLocaleString()}
        </span>
        <span className={`hero-net-rate ${isNeg ? "negative" : ""}`}>
          {isNeg ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
          {Math.abs(savingsRate)}% savings rate
        </span>
      </div>
      <div className="hero-stats">
        <div className="hero-stat">
          <div className="hero-stat-icon income-bg">
            <TrendingUp size={14} />
          </div>
          <div>
            <p className="hero-stat-label">Income</p>
            <p className="hero-stat-val income-val">
              NPR {totalIncome.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="hero-stat-divider" />
        <div className="hero-stat">
          <div className="hero-stat-icon expense-bg">
            <TrendingDown size={14} />
          </div>
          <div>
            <p className="hero-stat-label">Spent</p>
            <p className="hero-stat-val expense-val">
              NPR {totalExpenses.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="hero-stat-divider" />
        <div className="hero-stat">
          <div className="hero-stat-icon avg-bg">
            <Calendar size={14} />
          </div>
          <div>
            <p className="hero-stat-label">Avg/day</p>
            <p className="hero-stat-val">NPR {avgDaily.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Top Category Callout ─────────────────────────────────── */
function TopCategoryCallout({ overview, totalExpenses }) {
  if (!overview.length || totalExpenses === 0) return null;
  const top = [...overview]
    .filter((c) => parseFloat(c.total_amount) > 0)
    .sort((a, b) => parseFloat(b.total_amount) - parseFloat(a.total_amount))[0];
  if (!top) return null;
  const pct = Math.round((parseFloat(top.total_amount) / totalExpenses) * 100);
  return (
    <div className="top-cat-callout">
      <div className="top-cat-left">
        <span className="top-cat-badge">Top Spend</span>
        <span className="top-cat-name">{top.category_name}</span>
      </div>
      <div className="top-cat-right">
        <span className="top-cat-pct">{pct}%</span>
        <span className="top-cat-amt">
          NPR {parseFloat(top.total_amount).toLocaleString()}
        </span>
      </div>
    </div>
  );
}

/* ── Charts ───────────────────────────────────────────────── */
function IncomeExpenseChart({ totalIncome, totalExpenses }) {
  const data = [
    { name: "Period", Income: totalIncome, Expenses: totalExpenses },
  ];
  return (
    <div className="chart-card">
      <h4 className="chart-card-title">Income vs Expenses</h4>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart
          data={data}
          barCategoryGap="30%"
          barGap={6}
          margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
        >
          <XAxis dataKey="name" hide />
          <YAxis hide />
          <Tooltip
            formatter={(v) => `NPR ${v.toLocaleString()}`}
            contentStyle={{
              borderRadius: 10,
              border: "none",
              boxShadow: "0 4px 20px rgba(0,0,0,.12)",
              fontSize: 12,
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="Income" fill="#16a34a" radius={[6, 6, 0, 0]} />
          <Bar dataKey="Expenses" fill="#dc2626" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function BudgetDonut({ totalExpenses, budgets, overview }) {
  const hasBudget = budgets.length > 0;
  const totalBudget = hasBudget
    ? budgets.reduce((s, b) => s + parseFloat(b.amount || 0), 0)
    : 0;
  const isOverspent = hasBudget && totalExpenses > totalBudget;
  let pieData, centerLabel, centerSub;

  if (!hasBudget) {
    pieData = overview
      .filter((c) => parseFloat(c.total_amount) > 0)
      .map((c, i) => ({
        name: c.category_name,
        value: parseFloat(c.total_amount),
        color: CAT_COLORS[i % CAT_COLORS.length],
      }));
    centerLabel = `NPR ${totalExpenses.toLocaleString()}`;
    centerSub = "Total Spent";
  } else if (isOverspent) {
    pieData = overview
      .filter((c) => parseFloat(c.total_amount) > 0)
      .map((c, i) => ({
        name: c.category_name,
        value: parseFloat(c.total_amount),
        color: `hsl(${i * 14}, 65%, ${42 + i * 4}%)`,
      }));
    centerLabel = `-NPR ${(totalExpenses - totalBudget).toLocaleString()}`;
    centerSub = "Over Budget";
  } else {
    const expParts = overview
      .filter((c) => parseFloat(c.total_amount) > 0)
      .map((c, i) => ({
        name: c.category_name,
        value: parseFloat(c.total_amount),
        color: CAT_COLORS[i % CAT_COLORS.length],
      }));
    pieData = [
      ...expParts,
      {
        name: "Remaining",
        value: totalBudget - totalExpenses,
        color: "#e2e8f0",
      },
    ];
    centerLabel = `${Math.round((totalExpenses / totalBudget) * 100)}%`;
    centerSub = "Budget Used";
  }
  if (pieData.length === 0) {
    pieData = [{ name: "No Data", value: 1, color: "#e2e8f0" }];
    centerLabel = "NPR 0";
    centerSub = "No expenses";
  }

  return (
    <div className="chart-card">
      <h4 className="chart-card-title">
        {hasBudget ? "Budget vs Spending" : "Spending Breakdown"}
      </h4>
      <div className="budget-donut-wrap">
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={72}
              startAngle={90}
              endAngle={-270}
              strokeWidth={2}
              stroke="white"
            >
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, n) =>
                n === "No Data" ? null : [`NPR ${v.toLocaleString()}`, n]
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <span className={`donut-center-label ${isOverspent ? "over" : ""}`}>
            {centerLabel}
          </span>
          <span className="donut-center-sub">{centerSub}</span>
        </div>
      </div>
      <div className="donut-legend">
        {pieData
          .filter((d) => d.name !== "No Data")
          .map((d, i) => (
            <div key={i} className="donut-legend-item">
              <span
                className="donut-legend-dot"
                style={{ background: d.color }}
              />
              <span className="donut-legend-name">{d.name}</span>
              <span className="donut-legend-val">
                NPR {d.value.toLocaleString()}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

/* ── List Rows ────────────────────────────────────────────── */
function CategoryRow({ cat, index, onClick }) {
  return (
    <div className="cat-row" onClick={onClick}>
      <div className="cat-row-left">
        <div
          className="cat-row-icon-wrap"
          style={{ background: `${CAT_COLORS[index % CAT_COLORS.length]}18` }}
        >
          <CategoryIcon
            iconUrl={cat.icon_url}
            iconType={cat.icon_type}
            name={cat.category_name}
            color={CAT_COLORS[index % CAT_COLORS.length]}
            size={28}
          />
        </div>
        <div className="cat-row-info">
          <span className="cat-row-name">{cat.category_name}</span>
          <span className="cat-row-count">
            {cat.expense_count} expense{cat.expense_count !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
      <div className="cat-row-right">
        <span className="cat-row-amount">
          NPR {parseFloat(cat.total_amount).toLocaleString()}
        </span>
        <ChevronRight size={16} className="cat-row-arrow" />
      </div>
    </div>
  );
}

function IncomeSourceRow({ source, total, count, onClick }) {
  const cfg = INCOME_SOURCE_CONFIG[source] || INCOME_SOURCE_CONFIG.Others;
  const Icon = cfg.icon;
  return (
    <div className="cat-row" onClick={onClick}>
      <div className="cat-row-left">
        <div className="cat-row-icon-wrap" style={{ background: cfg.bg }}>
          <Icon size={18} color={cfg.color} strokeWidth={2.2} />
        </div>
        <div className="cat-row-info">
          <span className="cat-row-name">{source}</span>
          <span className="cat-row-count">
            {count} entr{count !== 1 ? "ies" : "y"}
          </span>
        </div>
      </div>
      <div className="cat-row-right">
        <span className="cat-row-amount income-amount">
          +NPR {total.toLocaleString()}
        </span>
        <ChevronRight size={16} className="cat-row-arrow" />
      </div>
    </div>
  );
}

/* ── Bottom Sheet ─────────────────────────────────────────── */
function BottomSheet({ open, onClose, children }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="exp-modal-overlay" onClick={onClose}>
      <div className="exp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="exp-modal-handle" />
        {children}
      </div>
    </div>
  );
}

/* ── Form helpers ─────────────────────────────────────────── */
function FormField({ label, children, required }) {
  return (
    <div className="exp-form-group">
      <label className="exp-form-label">
        {label}
        {required && <span className="required-star"> *</span>}
      </label>
      {children}
    </div>
  );
}

/* ── Edit Sheets ──────────────────────────────────────────── */
function EditExpenseSheet({ exp, categories, open, onClose, onSaved }) {
  const [form, setForm] = useState({
    amount: "",
    note: "",
    date: "",
    category_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (exp) {
      setForm({
        amount: exp.amount,
        note: exp.note || "",
        date: exp.date,
        category_id: exp.category_id || "",
      });
      setErr("");
    }
  }, [exp]);

  const handleSave = async () => {
    setErr("");
    if (!form.amount) {
      setErr("Amount is required.");
      return;
    }
    setSaving(true);
    try {
      await updateExpense(exp.expense_id, {
        category_id: form.category_id || exp.category_id,
        amount: parseFloat(form.amount),
        note: form.note || null,
        date: form.date,
      });
      onSaved();
      onClose();
    } catch (e) {
      setErr(e.message || "Failed to save.");
    }
    setSaving(false);
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="exp-modal-header">
        <h3 className="exp-modal-title">Edit Expense</h3>
        <button className="exp-modal-close" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {err && <p className="exp-modal-err">{err}</p>}
      <div className="exp-modal-body">
        <FormField label="Category" required>
          <select
            className="exp-input"
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
          >
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Amount (NPR)" required>
          <input
            type="number"
            className="exp-input"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="0.00"
          />
        </FormField>
        <FormField label="Date" required>
          <input
            type="date"
            className="exp-input"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </FormField>
        <FormField label="Note (optional)">
          <input
            type="text"
            className="exp-input"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Add a note..."
            maxLength={100}
          />
        </FormField>
        <button
          className="exp-submit-btn expense"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </BottomSheet>
  );
}

function EditIncomeSheet({ inc, open, onClose, onSaved }) {
  const [form, setForm] = useState({
    amount: "",
    source: "Salary",
    note: "",
    date: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (inc) {
      setForm({
        amount: inc.amount,
        source: inc.source || "Others",
        note: inc.note || "",
        date: inc.date,
      });
      setErr("");
    }
  }, [inc]);

  const handleSave = async () => {
    setErr("");
    if (!form.amount) {
      setErr("Amount is required.");
      return;
    }
    setSaving(true);
    try {
      await updateIncome(inc.income_id, {
        amount: parseFloat(form.amount),
        source: form.source,
        note: form.note || null,
        date: form.date,
      });
      onSaved();
      onClose();
    } catch (e) {
      setErr(e.message || "Failed to save.");
    }
    setSaving(false);
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="exp-modal-header">
        <h3 className="exp-modal-title">Edit Income</h3>
        <button className="exp-modal-close" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {err && <p className="exp-modal-err">{err}</p>}
      <div className="exp-modal-body">
        <FormField label="Source" required>
          <select
            className="exp-input"
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
          >
            {INCOME_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Amount (NPR)" required>
          <input
            type="number"
            className="exp-input"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="0.00"
          />
        </FormField>
        <FormField label="Date" required>
          <input
            type="date"
            className="exp-input"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </FormField>
        <FormField label="Note (optional)">
          <input
            type="text"
            className="exp-input"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Add a note..."
            maxLength={100}
          />
        </FormField>
        <button
          className="exp-submit-btn income"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </BottomSheet>
  );
}

/* ── Detail Views ─────────────────────────────────────────── */
function CategoryDetailView({ cat, range, categories, onBack, onRefresh }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingExp, setEditingExp] = useState(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getExpensesByCategory(
        cat.category_id,
        range.start,
        range.end,
      );
      setExpenses(res.data || res.expenses || res || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [cat.category_id, range.start, range.end]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.expense_id !== id));
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return expenses;
    const q = search.toLowerCase();
    return expenses.filter(
      (e) => (e.note || "").toLowerCase().includes(q) || e.date.includes(q),
    );
  }, [expenses, search]);

  const exportCSV = () => {
    const rows = [
      ["Date", "Note", "Amount"],
      ...expenses.map((e) => [e.date, e.note || "", e.amount]),
    ];
    const a = document.createElement("a");
    a.href =
      "data:text/csv," +
      encodeURIComponent(rows.map((r) => r.join(",")).join("\n"));
    a.download = `${cat.category_name}_expenses.csv`;
    a.click();
  };

  return (
    <div className="cat-detail-view">
      <div className="cat-detail-header">
        <button className="back-btn" onClick={onBack}>
          <ChevronLeft size={18} /> Back
        </button>
        <div className="cat-detail-title">
          <span>{cat.category_name}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="cat-detail-total">
              NPR {parseFloat(cat.total_amount).toLocaleString()}
            </span>
            <button className="icon-btn" onClick={exportCSV} title="Export CSV">
              <Download size={15} />
            </button>
          </div>
        </div>
      </div>
      <div className="detail-search-wrap">
        <Search size={14} className="detail-search-icon" />
        <input
          type="text"
          className="detail-search-input"
          placeholder="Search by note or date..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="detail-search-clear" onClick={() => setSearch("")}>
            <X size={13} />
          </button>
        )}
      </div>
      {loading ? (
        <div className="skeleton-list">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="exp-empty">
          <PiggyBank size={36} strokeWidth={1.2} />
          <p>
            {search
              ? "No results match your search."
              : "No expenses in this category."}
          </p>
        </div>
      ) : (
        <div className="stmt-list">
          {filtered.map((exp) => (
            <div key={exp.expense_id} className="stmt-row">
              <div className="stmt-row-left">
                <div className="stmt-row-dot expense" />
                <div>
                  <p className="stmt-row-name">
                    {exp.note ||
                      exp.categories?.name ||
                      cat.category_name ||
                      "Expense"}
                    {exp.is_auto && <AutoBadge />}
                  </p>
                  <p className="stmt-row-meta">{exp.date}</p>
                </div>
              </div>
              <div className="stmt-row-right">
                <span className="stmt-row-amount expense">
                  -NPR {parseFloat(exp.amount).toLocaleString()}
                </span>
                <div className="row-actions">
                  <button
                    className="row-action-btn edit"
                    onClick={() => {
                      setEditingExp(exp);
                      setEditSheetOpen(true);
                    }}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    className="row-action-btn delete"
                    onClick={() => handleDelete(exp.expense_id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <EditExpenseSheet
        exp={editingExp}
        categories={categories}
        open={editSheetOpen}
        onClose={() => setEditSheetOpen(false)}
        onSaved={async () => {
          await load();
          onRefresh();
        }}
      />
    </div>
  );
}

function IncomeSourceDetailView({ source, entries, onBack, onRefresh }) {
  const [localEntries, setLocalEntries] = useState(entries);
  const [editingInc, setEditingInc] = useState(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLocalEntries(entries);
  }, [entries]);

  const cfg = INCOME_SOURCE_CONFIG[source] || INCOME_SOURCE_CONFIG.Others;
  const Icon = cfg.icon;
  const total = localEntries.reduce((s, i) => s + parseFloat(i.amount), 0);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this income entry?")) return;
    try {
      await deleteIncome(id);
      setLocalEntries((prev) => prev.filter((e) => e.income_id !== id));
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return localEntries;
    const q = search.toLowerCase();
    return localEntries.filter(
      (e) => (e.note || "").toLowerCase().includes(q) || e.date.includes(q),
    );
  }, [localEntries, search]);

  return (
    <div className="cat-detail-view">
      <div className="cat-detail-header">
        <button className="back-btn" onClick={onBack}>
          <ChevronLeft size={18} /> Back
        </button>
        <div className="cat-detail-title">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              className="cat-row-icon-wrap"
              style={{ background: cfg.bg, width: 32, height: 32 }}
            >
              <Icon size={16} color={cfg.color} strokeWidth={2.2} />
            </div>
            <span>{source}</span>
          </div>
          <span className="cat-detail-total" style={{ color: "#16a34a" }}>
            +NPR {total.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="detail-search-wrap">
        <Search size={14} className="detail-search-icon" />
        <input
          type="text"
          className="detail-search-input"
          placeholder="Search by note or date..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="detail-search-clear" onClick={() => setSearch("")}>
            <X size={13} />
          </button>
        )}
      </div>
      {filtered.length === 0 ? (
        <div className="exp-empty">
          <TrendingUp size={36} strokeWidth={1.2} />
          <p>
            {search
              ? "No results match your search."
              : "No income entries for this source."}
          </p>
        </div>
      ) : (
        <div className="stmt-list">
          {filtered.map((inc) => (
            <div key={inc.income_id} className="stmt-row">
              <div className="stmt-row-left">
                <div className="stmt-row-dot income" />
                <div>
                  <p className="stmt-row-name">
                    {inc.note || source}
                    {inc.is_auto && <AutoBadge />}
                  </p>
                  <p className="stmt-row-meta">{inc.date}</p>
                </div>
              </div>
              <div className="stmt-row-right">
                <span className="stmt-row-amount" style={{ color: "#16a34a" }}>
                  +NPR {parseFloat(inc.amount).toLocaleString()}
                </span>
                <div className="row-actions">
                  <button
                    className="row-action-btn edit"
                    onClick={() => {
                      setEditingInc(inc);
                      setEditSheetOpen(true);
                    }}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    className="row-action-btn delete"
                    onClick={() => handleDelete(inc.income_id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <EditIncomeSheet
        inc={editingInc}
        open={editSheetOpen}
        onClose={() => setEditSheetOpen(false)}
        onSaved={() => {
          onRefresh();
          onBack();
        }}
      />
    </div>
  );
}

/* ── Budget Card ──────────────────────────────────────────── */
function BudgetCard({ budget: b, categories, onRefresh }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    amount: b.amount,
    category_id: b.category_id || "",
    period_start: b.period_start,
    period_end: b.period_end,
  });

  const handleDelete = async () => {
    if (!window.confirm("Delete this budget?")) return;
    try {
      await deleteBudget(b.budget_id);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    setErr("");
    if (!form.amount) {
      setErr("Amount is required.");
      return;
    }
    setSaving(true);
    try {
      await updateBudget(b.budget_id, {
        amount: parseFloat(form.amount),
        category_id: form.category_id || null,
        period_start: form.period_start,
        period_end: form.period_end,
      });
      setEditing(false);
      onRefresh();
    } catch (e) {
      setErr(e.message || "Failed to save.");
    }
    setSaving(false);
  };

  const barColor =
    b.utilization_pct >= 90
      ? "#ef4444"
      : b.utilization_pct >= 70
        ? "#f59e0b"
        : "#1e5c38";

  return (
    <div className="exp-budget-card">
      {editing ? (
        <div className="budget-edit-form">
          {err && (
            <p className="exp-modal-err" style={{ marginBottom: 10 }}>
              {err}
            </p>
          )}
          <FormField label="Category">
            <select
              className="exp-input"
              style={{ padding: "8px 12px", fontSize: 13 }}
              value={form.category_id}
              onChange={(e) =>
                setForm({ ...form, category_id: e.target.value })
              }
            >
              <option value="">Overall Budget</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Amount (NPR)" required>
            <input
              type="number"
              className="exp-input"
              style={{ padding: "8px 12px", fontSize: 13 }}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </FormField>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="exp-form-group" style={{ flex: 1 }}>
              <label className="exp-form-label">Start</label>
              <input
                type="date"
                className="exp-input"
                style={{ padding: "8px 12px", fontSize: 13 }}
                value={form.period_start}
                onChange={(e) =>
                  setForm({ ...form, period_start: e.target.value })
                }
              />
            </div>
            <div className="exp-form-group" style={{ flex: 1 }}>
              <label className="exp-form-label">End</label>
              <input
                type="date"
                className="exp-input"
                style={{ padding: "8px 12px", fontSize: 13 }}
                value={form.period_end}
                onChange={(e) =>
                  setForm({ ...form, period_end: e.target.value })
                }
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              className="edit-save-btn"
              onClick={handleSave}
              disabled={saving}
              style={{ flex: 1 }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              className="edit-cancel-btn"
              onClick={() => {
                setEditing(false);
                setErr("");
              }}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="exp-budget-top">
            <div>
              <p className="exp-budget-name">
                {b.categories?.name || "Overall"}
              </p>
              <p className="exp-budget-meta">
                NPR {parseFloat(b.spent || 0).toLocaleString()} of NPR{" "}
                {parseFloat(b.amount).toLocaleString()}
                <span className="exp-budget-period">
                  {" "}
                  · {b.period_start} → {b.period_end}
                </span>
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                className={`exp-budget-pct ${b.utilization_pct >= 90 ? "danger" : b.utilization_pct >= 70 ? "warn" : ""}`}
              >
                {b.utilization_pct}%
              </span>
              <button
                className="row-action-btn edit"
                onClick={() => setEditing(true)}
              >
                <Pencil size={13} />
              </button>
              <button className="row-action-btn delete" onClick={handleDelete}>
                <Trash2 size={13} />
              </button>
            </div>
          </div>
          <div className="exp-budget-bar-bg">
            <div
              className="exp-budget-bar-fill"
              style={{
                width: `${Math.min(b.utilization_pct, 100)}%`,
                background: barColor,
              }}
            />
          </div>
          {b.utilization_pct >= 90 && (
            <p className="budget-warning">
              <AlertTriangle size={12} />
              {b.utilization_pct >= 100
                ? "Over budget!"
                : "Almost at budget limit"}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────── */
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
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [apiErr, setApiErr] = useState("");

  // ── BUG FIX: separate state for date range validation error ──
  const [dateRangeErr, setDateRangeErr] = useState("");

  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedSource, setSelectedSource] = useState(null);
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

    // ── BUG FIX: validate that end date is not before start date ──
    if (new Date(range.end) < new Date(range.start)) {
      setDateRangeErr("End date cannot be before start date.");
      return;
    }

    // Clear any previous date range error if dates are now valid
    setDateRangeErr("");

    setLoading(true);
    try {
      const [ov, inc, bud, cats] = await Promise.all([
        getExpenseOverview(range.start, range.end),
        getIncome(range.start, range.end),
        getBudgets(range.start, range.end),
        getCategories(),
      ]);
      const catsArr = cats.data || cats.categories || cats || [];
      const catMap = {};
      catsArr.forEach((c) => {
        catMap[c.category_id] = c;
      });
      const ovArr = (ov.data || ov || []).map((cat) => ({
        ...cat,
        icon_url: catMap[cat.category_id]?.icon_url ?? null,
        icon_type: catMap[cat.category_id]?.icon_type ?? "svg",
      }));
      setOverview(ovArr);
      setCategories(catsArr);
      const incomeArr = inc.data || [];
      setIncomeList(incomeArr);
      setTotalIncome(
        incomeArr.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0),
      );
      setBudgets(bud.data || bud || []);
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

  const incomeBySource = incomeList.reduce((acc, inc) => {
    const key = inc.source || "Others";
    if (!acc[key]) acc[key] = { source: key, entries: [], total: 0, count: 0 };
    acc[key].entries.push(inc);
    acc[key].total += parseFloat(inc.amount || 0);
    acc[key].count++;
    return acc;
  }, {});
  const incomeSources = Object.values(incomeBySource).sort(
    (a, b) => b.total - a.total,
  );

  const openModal = (type) => {
    setApiErr("");
    setModal(type);
  };

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
        is_auto: false,
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
        is_auto: false,
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

  if (selectedSource && range) {
    return (
      <div className="expenses-page">
        <IncomeSourceDetailView
          source={selectedSource}
          entries={incomeBySource[selectedSource]?.entries || []}
          onBack={() => setSelectedSource(null)}
          onRefresh={fetchAll}
        />
      </div>
    );
  }
  if (selectedCat && range) {
    return (
      <div className="expenses-page">
        <CategoryDetailView
          cat={selectedCat}
          range={range}
          categories={categories}
          onBack={() => setSelectedCat(null)}
          onRefresh={fetchAll}
        />
      </div>
    );
  }

  return (
    <div className="expenses-page">
      {/* Header */}
      <div className="exp-header">
        <div>
          <h2 className="exp-title">Expenses</h2>
          <p className="exp-sub">Track your income &amp; spending</p>
        </div>
        <div className="exp-header-btns">
          <button
            className="exp-btn income"
            onClick={() => openModal("income")}
          >
            <Plus size={15} /> Income
          </button>
          <button
            className="exp-btn expense"
            onClick={() => openModal("expense")}
          >
            <Plus size={15} /> Expense
          </button>
          <button
            className="exp-btn budget"
            onClick={() => openModal("budget")}
          >
            <Target size={15} /> Budget
          </button>
        </div>
      </div>

      {/* Date Filters */}
      <div className="exp-filters">
        {["today", "thismonth", "90days", "custom"].map((f) => (
          <button
            key={f}
            className={`exp-filter-btn ${dateFilter === f ? "active" : ""}`}
            onClick={() => {
              setDateFilter(f);
              setDateRangeErr("");
            }}
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

      {/* Custom date range inputs */}
      {dateFilter === "custom" && (
        <div>
          <div className="exp-custom-range">
            <input
              type="date"
              value={customStart}
              onChange={(e) => {
                setCustomStart(e.target.value);
                setDateRangeErr("");
              }}
              className="exp-date-input"
            />
            <span>to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => {
                setCustomEnd(e.target.value);
                setDateRangeErr("");
              }}
              className="exp-date-input"
            />
          </div>
          {/* ── BUG FIX: show error message below date inputs ── */}
          {dateRangeErr && (
            <p
              className="exp-modal-err"
              style={{
                margin: "6px 0 0 0",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <AlertTriangle size={13} />
              {dateRangeErr}
            </p>
          )}
        </div>
      )}

      {/* Hero + Charts */}
      {loading ? (
        <div className="skeleton-list">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <>
          <HeroPanel
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            netSavings={netSavings}
            range={range}
          />
          {totalExpenses > 0 && (
            <TopCategoryCallout
              overview={overview}
              totalExpenses={totalExpenses}
            />
          )}
          <div className="charts-grid">
            <IncomeExpenseChart
              totalIncome={totalIncome}
              totalExpenses={totalExpenses}
            />
            <BudgetDonut
              totalExpenses={totalExpenses}
              budgets={budgets}
              overview={overview}
            />
          </div>
        </>
      )}

      {/* Budgets */}
      {budgets.length > 0 && (
        <div className="exp-budget-section">
          <h3 className="exp-section-heading">
            <Target size={15} /> Budgets
          </h3>
          {budgets.map((b) => (
            <BudgetCard
              key={b.budget_id}
              budget={b}
              categories={categories}
              onRefresh={fetchAll}
            />
          ))}
        </div>
      )}

      {/* Expenses List */}
      <div className="exp-list-section">
        <h3 className="exp-section-heading">
          <TrendingDown size={15} /> Expenses by Category
        </h3>
        {loading ? (
          <div className="skeleton-list">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : overview.filter((c) => parseFloat(c.total_amount) > 0).length ===
          0 ? (
          <div className="exp-empty">
            <PiggyBank size={40} strokeWidth={1.2} />
            <p>No expenses yet. Add your first expense to get started.</p>
            <button
              className="exp-empty-cta expense"
              onClick={() => openModal("expense")}
            >
              <Plus size={14} /> Add Expense
            </button>
          </div>
        ) : (
          <div className="cat-list">
            {overview
              .filter((c) => parseFloat(c.total_amount) > 0)
              .map((cat, i) => (
                <CategoryRow
                  key={cat.category_id}
                  cat={cat}
                  index={i}
                  onClick={() => setSelectedCat(cat)}
                />
              ))}
          </div>
        )}
      </div>

      {/* Income List */}
      <div className="exp-list-section income-section">
        <h3 className="exp-section-heading income-heading">
          <TrendingUp size={15} /> Income by Source
        </h3>
        {loading ? (
          <div className="skeleton-list">
            {[1, 2].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : incomeSources.length === 0 ? (
          <div className="exp-empty">
            <TrendingUp size={40} strokeWidth={1.2} />
            <p>No income recorded. Add income to track your earnings.</p>
            <button
              className="exp-empty-cta income"
              onClick={() => openModal("income")}
            >
              <Plus size={14} /> Add Income
            </button>
          </div>
        ) : (
          <div className="cat-list">
            {incomeSources.map((src) => (
              <IncomeSourceRow
                key={src.source}
                source={src.source}
                total={src.total}
                count={src.count}
                onClick={() => setSelectedSource(src.source)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      <BottomSheet open={!!modal} onClose={() => setModal(null)}>
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
          <button className="exp-modal-close" onClick={() => setModal(null)}>
            <X size={20} />
          </button>
        </div>
        {apiErr && <p className="exp-modal-err">{apiErr}</p>}

        {modal === "expense" && (
          <div className="exp-modal-body">
            <FormField label="Category" required>
              <select
                value={expForm.category_id}
                onChange={(e) =>
                  setExpForm({ ...expForm, category_id: e.target.value })
                }
                className="exp-input"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Amount (NPR)" required>
              <input
                type="number"
                placeholder="0.00"
                value={expForm.amount}
                onChange={(e) =>
                  setExpForm({ ...expForm, amount: e.target.value })
                }
                className="exp-input"
              />
            </FormField>
            <FormField label="Date" required>
              <input
                type="date"
                value={expForm.date}
                onChange={(e) =>
                  setExpForm({ ...expForm, date: e.target.value })
                }
                className="exp-input"
              />
            </FormField>
            <FormField label="Note (optional)">
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
            </FormField>
            <button
              className="exp-submit-btn expense"
              onClick={handleAddExpense}
              disabled={saving}
            >
              {saving ? "Saving..." : "Add Expense"}
            </button>
          </div>
        )}
        {modal === "income" && (
          <div className="exp-modal-body">
            <FormField label="Source" required>
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
            </FormField>
            <FormField label="Amount (NPR)" required>
              <input
                type="number"
                placeholder="0.00"
                value={incForm.amount}
                onChange={(e) =>
                  setIncForm({ ...incForm, amount: e.target.value })
                }
                className="exp-input"
              />
            </FormField>
            <FormField label="Date" required>
              <input
                type="date"
                value={incForm.date}
                onChange={(e) =>
                  setIncForm({ ...incForm, date: e.target.value })
                }
                className="exp-input"
              />
            </FormField>
            <FormField label="Note (optional)">
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
            </FormField>
            <button
              className="exp-submit-btn income"
              onClick={handleAddIncome}
              disabled={saving}
            >
              {saving ? "Saving..." : "Add Income"}
            </button>
          </div>
        )}
        {modal === "budget" && (
          <div className="exp-modal-body">
            <FormField label="Category (leave empty for overall)">
              <select
                value={budForm.category_id}
                onChange={(e) =>
                  setBudForm({ ...budForm, category_id: e.target.value })
                }
                className="exp-input"
              >
                <option value="">Overall Budget</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Budget Amount (NPR)" required>
              <input
                type="number"
                placeholder="0.00"
                value={budForm.amount}
                onChange={(e) =>
                  setBudForm({ ...budForm, amount: e.target.value })
                }
                className="exp-input"
              />
            </FormField>
            <div style={{ display: "flex", gap: 10 }}>
              <FormField label="Period Start" required>
                <input
                  type="date"
                  value={budForm.period_start}
                  onChange={(e) =>
                    setBudForm({ ...budForm, period_start: e.target.value })
                  }
                  className="exp-input"
                />
              </FormField>
              <FormField label="Period End" required>
                <input
                  type="date"
                  value={budForm.period_end}
                  onChange={(e) =>
                    setBudForm({ ...budForm, period_end: e.target.value })
                  }
                  className="exp-input"
                />
              </FormField>
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
      </BottomSheet>
    </div>
  );
}
