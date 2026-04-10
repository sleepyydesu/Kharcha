import { useState, useEffect, useMemo, useCallback } from "react";
import { getTransactions, getTransactionCategories } from "../services/api";
import "./Statements.css";

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDefaults() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const prevYear  = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
  const prevMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
  const lastDayOfPrev = new Date(prevYear, prevMonth + 1, 0).getDate();
  const clampedDay = Math.min(today.getDate(), lastDayOfPrev);
  return {
    startDate: toISO(new Date(prevYear, prevMonth, clampedDay)),
    endDate:   toISO(today),
  };
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-NP", { day: "numeric", month: "short", year: "numeric" });
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("en-NP", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function fmtAmt(amount, type) {
  const abs = Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (type === "sent" ? "− " : "+ ") + "Rs. " + abs;
}

function Avatar({ name, src, icon }) {
  if (src) return <img className="stmt-avatar stmt-avatar--img" src={src} alt={name} />;
  if (icon) return <span className="stmt-avatar stmt-avatar--icon">{icon}</span>;
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return <span className="stmt-avatar stmt-avatar--initials">{initials}</span>;
}

export default function Statements() {
  const defaults = getDefaults();

  const [search,     setSearch]     = useState("");
  const [txType,     setTxType]     = useState("all");
  const [categoryId, setCategoryId] = useState("");
  const [startDate,  setStartDate]  = useState(defaults.startDate);
  const [endDate,    setEndDate]    = useState(defaults.endDate);
  const [categories, setCategories] = useState([]);
  const [statements,  setStatements]  = useState([]);
  const [pagination,  setPagination]  = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState(null);
  const [applied, setApplied] = useState({
    search: "", txType: "all", categoryId: "",
    startDate: defaults.startDate, endDate: defaults.endDate,
  });

  useEffect(() => {
    getTransactionCategories().then(r => setCategories(r.categories || [])).catch(() => {});
  }, []);

  const fetchStatements = useCallback(async (params, page, append) => {
    (append ? setLoadingMore : setLoading)(true);
    setError(null);
    try {
      const res = await getTransactions({
        type:        params.txType,
        category_id: params.categoryId || undefined,
        start_date:  params.startDate,
        end_date:    params.endDate,
        page,
        limit: 20,
      });
      setStatements(prev => append ? [...prev, ...(res.statements || [])] : (res.statements || []));
      setPagination(res.pagination);
    } catch (err) {
      setError(err.message || "Failed to load transactions.");
    } finally {
      (append ? setLoadingMore : setLoading)(false);
    }
  }, []);

  useEffect(() => { fetchStatements(applied, 1, false); }, []); // eslint-disable-line

  const handleFilter = () => {
    const next = { search, txType, categoryId, startDate, endDate };
    setApplied(next);
    fetchStatements(next, 1, false);
  };

  const handleReset = () => {
    const d = getDefaults();
    setSearch(""); setTxType("all"); setCategoryId("");
    setStartDate(d.startDate); setEndDate(d.endDate);
    const next = { search: "", txType: "all", categoryId: "", ...d };
    setApplied(next);
    fetchStatements(next, 1, false);
  };

  const filtered = useMemo(() => {
    const q = applied.search.trim().toLowerCase();
    if (!q) return statements;
    return statements.filter(t =>
      (t.counterparty?.display_name || "").toLowerCase().includes(q) ||
      (t.remarks || "").toLowerCase().includes(q) ||
      (t.category || "").toLowerCase().includes(q)
    );
  }, [statements, applied.search]);

  const totalIn  = filtered.filter(t => t.type === "received").reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = filtered.filter(t => t.type === "sent").reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="stmt-page">
      <div className="stmt-container">

        <div className="stmt-page-header">
          <div>
            <h1 className="stmt-title">Transaction History</h1>
            <p className="stmt-subtitle">{fmtDate(applied.startDate)} — {fmtDate(applied.endDate)}</p>
          </div>
          <button className="stmt-export-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            EXPORT
          </button>
        </div>

        <div className="stmt-panel">
          <div className="stmt-panel__head">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="4" y1="6" x2="20" y2="6"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
              <line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            FILTER
          </div>

          <div className="stmt-grid">
            <div className="stmt-field">
              <label className="stmt-label">Search</label>
              <div className="stmt-input-wrap">
                <svg className="stmt-search-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  className="stmt-input stmt-input--padded"
                  type="text"
                  placeholder="Search by name or remarks…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleFilter()}
                />
              </div>
            </div>

            <div className="stmt-field">
              <label className="stmt-label">Category</label>
              <select className="stmt-select" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.icon ? c.icon + " " : ""}{c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="stmt-field">
              <label className="stmt-label">Transaction Type</label>
              <select className="stmt-select" value={txType} onChange={e => setTxType(e.target.value)}>
                <option value="all">All Transactions</option>
                <option value="received">Received (Money In)</option>
                <option value="sent">Sent (Money Out)</option>
              </select>
            </div>

            <div className="stmt-field stmt-field--empty" />

            <div className="stmt-field">
              <label className="stmt-label">Start Date</label>
              <input className="stmt-input" type="date" value={startDate} max={endDate} onChange={e => setStartDate(e.target.value)} />
            </div>

            <div className="stmt-field">
              <label className="stmt-label">End Date</label>
              <input className="stmt-input" type="date" value={endDate} min={startDate} max={toISO(new Date())} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="stmt-actions">
            <button className="stmt-btn stmt-btn--primary" onClick={handleFilter} disabled={loading}>
              {loading ? "Filtering…" : "Filter"}
            </button>
            <button className="stmt-btn stmt-btn--reset" onClick={handleReset} disabled={loading}>
              Reset
            </button>
          </div>
        </div>

        {error && (
          <div className="stmt-error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {loading && (
          <div className="stmt-skeletons">
            {[0,1,2,3,4].map(i => <div key={i} className="stmt-skeleton" style={{ animationDelay: `${i * 80}ms` }} />)}
          </div>
        )}

        {!loading && !error && (
          <>
            {filtered.length > 0 && (
              <div className="stmt-summary">
                <div className="stmt-summary__item">
                  <span className="stmt-summary__label">Total Received</span>
                  <span className="stmt-summary__val stmt-summary__val--in">
                    + Rs. {totalIn.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="stmt-summary__sep" />
                <div className="stmt-summary__item">
                  <span className="stmt-summary__label">Total Sent</span>
                  <span className="stmt-summary__val stmt-summary__val--out">
                    − Rs. {totalOut.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="stmt-summary__sep" />
                <div className="stmt-summary__item">
                  <span className="stmt-summary__label">Transactions</span>
                  <span className="stmt-summary__val">
                    {filtered.length}{pagination?.total > statements.length ? ` of ${pagination.total}` : ""}
                  </span>
                </div>
              </div>
            )}

            {filtered.length === 0 && (
              <div className="stmt-empty">
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                  <rect x="9" y="3" width="6" height="4" rx="1"/>
                  <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/>
                </svg>
                <p>You do not have any transactions for the selected period.</p>
              </div>
            )}

            {filtered.length > 0 && (
              <div className="stmt-list">
                {filtered.map((t, i) => {
                  const thisDay = t.created_at?.slice(0, 10);
                  const prevDay = i > 0 ? filtered[i - 1].created_at?.slice(0, 10) : null;
                  return (
                    <div key={t.transaction_id}>
                      {thisDay !== prevDay && <div className="stmt-date-sep">{fmtDate(t.created_at)}</div>}
                      <div className="stmt-row">
                        <Avatar name={t.counterparty?.display_name} src={t.counterparty?.profile_picture} icon={t.category_icon} />
                        <div className="stmt-row__body">
                          <span className="stmt-row__name">{t.counterparty?.display_name || "Unknown"}</span>
                          <span className="stmt-row__meta">
                            {t.category && <span className="stmt-row__tag">{t.category}</span>}
                            {t.remarks  && <span className="stmt-row__remarks">{t.remarks}</span>}
                            <span className="stmt-row__time">{fmtTime(t.created_at)}</span>
                          </span>
                        </div>
                        <div className="stmt-row__end">
                          <span className={`stmt-row__amount ${t.type === "sent" ? "out" : "in"}`}>
                            {fmtAmt(t.amount, t.type)}
                          </span>
                          <span className={`stmt-row__status status-${(t.status || "").toLowerCase()}`}>
                            {t.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {pagination?.has_next && (
                  <div className="stmt-more">
                    <button className="stmt-btn stmt-btn--ghost" onClick={() => fetchStatements(applied, pagination.page + 1, true)} disabled={loadingMore}>
                      {loadingMore ? "Loading…" : `Load more (${pagination.total - statements.length} remaining)`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}