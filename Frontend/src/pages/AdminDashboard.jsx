import { useState, useEffect, useCallback } from "react";
import {
  adminListVerifications,
  adminGetVerification,
  adminReviewVerification,
  adminListGiftCards,
  adminGenerateGiftCards,
  adminDeactivateGiftCard,
  adminListCardRequests,
  adminActivateCard,
} from "../services/api";
import "./AdminDashboard.css";

// ── Helpers ────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NP", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-NP", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtNPR(n) {
  return `Rs. ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

// ── Toast ──────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [msg]);
  if (!msg) return null;
  return (
    <div className={`adm-toast adm-toast--${type}`}>
      {type === "success" ? (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )}
      {msg}
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    pending: "adm-badge--warn",
    approved: "adm-badge--success",
    rejected: "adm-badge--error",
    issued: "adm-badge--info",
    active: "adm-badge--success",
    inactive: "adm-badge--muted",
  };
  return (
    <span className={`adm-badge ${map[status] || "adm-badge--muted"}`}>
      {status}
    </span>
  );
}

// ── Empty state ────────────────────────────────────────────────
function EmptyState({ icon, message }) {
  return (
    <div className="adm-empty">
      <div className="adm-empty-icon">{icon}</div>
      <p>{message}</p>
    </div>
  );
}

// ── Skeleton rows ─────────────────────────────────────────────
function SkeletonRows({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="adm-skel-row" />
      ))}
    </>
  );
}

// ── SECTION: Verification Requests ────────────────────────────
function VerificationSection({ toast }) {
  const [tab, setTab] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDL] = useState(false);
  const [reviewLoading, setRL] = useState(false);
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminListVerifications({ status: tab, limit: 50 });
      setItems(res.data || []);
    } catch (e) {
      toast(e.message || "Failed to load verifications.", "error");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (item) => {
    setSelected(item);
    setNotes("");
    setDL(true);
    try {
      const res = await adminGetVerification(item.request_id);
      setDetail(res.data);
    } catch (e) {
      toast(e.message || "Failed to load details.", "error");
      setDetail(null);
    } finally {
      setDL(false);
    }
  };

  const closeDetail = () => {
    setSelected(null);
    setDetail(null);
    setNotes("");
  };

  const review = async (action) => {
    if (!selected) return;
    setRL(true);
    try {
      await adminReviewVerification(selected.request_id, {
        action,
        admin_notes: notes,
      });
      toast(`Verification request ${action}d successfully.`, "success");
      closeDetail();
      load();
    } catch (e) {
      toast(e.message || "Action failed.", "error");
    } finally {
      setRL(false);
    }
  };

  return (
    <div className="adm-section">
      <div className="adm-section-header">
        <div className="adm-section-title-wrap">
          <div className="adm-section-icon adm-section-icon--blue">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div>
            <h2 className="adm-section-title">KYC Verifications</h2>
            <p className="adm-section-sub">
              Review and approve user identity requests
            </p>
          </div>
        </div>
        <div className="adm-tabs">
          {["pending", "approved", "rejected"].map((t) => (
            <button
              key={t}
              className={`adm-tab ${tab === t ? "adm-tab--active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="adm-table-wrap">
        {loading ? (
          <SkeletonRows />
        ) : items.length === 0 ? (
          <EmptyState
            icon={
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            }
            message={`No ${tab} verification requests.`}
          />
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>DOB</th>
                <th>Submitted</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.request_id} className="adm-table-row">
                  <td className="adm-td-name">{item.user?.full_name || "—"}</td>
                  <td className="adm-td-sub">{item.user?.email || "—"}</td>
                  <td className="adm-td-sub">{item.dob || "—"}</td>
                  <td className="adm-td-sub">{fmtDate(item.created_at)}</td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                  <td>
                    <button
                      className="adm-row-btn"
                      onClick={() => openDetail(item)}
                    >
                      {tab === "pending" ? "Review" : "View"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="adm-modal-overlay" onClick={closeDetail}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3>Verification Request</h3>
              <button className="adm-modal-close" onClick={closeDetail}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {detailLoading ? (
              <div className="adm-modal-loading">
                <span className="adm-spinner" />
              </div>
            ) : detail ? (
              <div className="adm-modal-body">
                <div className="adm-detail-grid">
                  <div className="adm-detail-row">
                    <span className="adm-detail-label">Full Name</span>
                    <span className="adm-detail-val">
                      {detail.user?.full_name || "—"}
                    </span>
                  </div>
                  <div className="adm-detail-row">
                    <span className="adm-detail-label">Email</span>
                    <span className="adm-detail-val">
                      {detail.user?.email || "—"}
                    </span>
                  </div>
                  <div className="adm-detail-row">
                    <span className="adm-detail-label">Phone</span>
                    <span className="adm-detail-val">
                      {detail.user?.phone_number || "—"}
                    </span>
                  </div>
                  <div className="adm-detail-row">
                    <span className="adm-detail-label">DOB (submitted)</span>
                    <span className="adm-detail-val">{detail.dob || "—"}</span>
                  </div>
                  <div className="adm-detail-row">
                    <span className="adm-detail-label">DOB (on profile)</span>
                    <span className="adm-detail-val">
                      {detail.user?.dob_on_profile || "—"}
                    </span>
                  </div>
                  <div className="adm-detail-row">
                    <span className="adm-detail-label">Member Since</span>
                    <span className="adm-detail-val">
                      {fmtDate(detail.user?.account_created_at)}
                    </span>
                  </div>
                  <div className="adm-detail-row">
                    <span className="adm-detail-label">Wallet Balance</span>
                    <span className="adm-detail-val adm-detail-val--highlight">
                      {fmtNPR(detail.user?.wallet_balance)}
                    </span>
                  </div>
                  <div className="adm-detail-row">
                    <span className="adm-detail-label">Transactions</span>
                    <span className="adm-detail-val">
                      {detail.user?.transaction_count ?? "—"}
                    </span>
                  </div>
                  <div className="adm-detail-row">
                    <span className="adm-detail-label">Status</span>
                    <span className="adm-detail-val">
                      <StatusBadge status={detail.status} />
                    </span>
                  </div>
                  <div className="adm-detail-row">
                    <span className="adm-detail-label">Submitted</span>
                    <span className="adm-detail-val">
                      {fmtDateTime(detail.created_at)}
                    </span>
                  </div>
                </div>

                {detail.status === "pending" && (
                  <div className="adm-review-area">
                    <label className="adm-label">Admin Notes (optional)</label>
                    <textarea
                      className="adm-textarea"
                      placeholder="Add a note for this decision…"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                    <div className="adm-review-btns">
                      <button
                        className="adm-btn adm-btn--approve"
                        onClick={() => review("approve")}
                        disabled={reviewLoading}
                      >
                        {reviewLoading ? (
                          <span className="adm-spinner adm-spinner--sm" />
                        ) : null}
                        Approve
                      </button>
                      <button
                        className="adm-btn adm-btn--reject"
                        onClick={() => review("reject")}
                        disabled={reviewLoading}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}

                {detail.admin_notes && detail.status !== "pending" && (
                  <div className="adm-notes-display">
                    <span className="adm-label">Admin Notes:</span>
                    <p>{detail.admin_notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="adm-modal-err">Could not load details.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── SECTION: Gift Cards ────────────────────────────────────────
function GiftCardSection({ toast }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showGen, setShowGen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [deactivating, setDeact] = useState(null);

  // Generate form state
  const [amounts, setAmounts] = useState([{ amount: "", qty: "" }]);
  const [maxUses, setMaxUses] = useState(1);
  const [genLoading, setGenLoad] = useState(false);
  const [generated, setGenerated] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter === "all" ? {} : { is_active: filter === "active" };
      const res = await adminListGiftCards({ ...params, limit: 100 });
      setCards(res.data || []);
    } catch (e) {
      toast(e.message || "Failed to load gift cards.", "error");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const deactivate = async (id) => {
    if (!window.confirm("Deactivate this gift card? This cannot be undone."))
      return;
    setDeact(id);
    try {
      await adminDeactivateGiftCard(id);
      toast("Gift card deactivated.", "success");
      load();
    } catch (e) {
      toast(e.message || "Failed to deactivate.", "error");
    } finally {
      setDeact(null);
    }
  };

  const generate = async () => {
    const body = { max_uses: Number(maxUses) };
    let valid = true;
    amounts.forEach(({ amount, qty }) => {
      if (!amount || !qty || Number(amount) <= 0 || Number(qty) <= 0) {
        valid = false;
        return;
      }
      body[String(amount)] = Number(qty);
    });
    if (!valid)
      return toast("Please fill in all amount/quantity fields.", "error");
    setGenLoad(true);
    try {
      const res = await adminGenerateGiftCards(body);
      setGenerated(res);
      toast(`Generated ${res.total_generated} gift card(s).`, "success");
      load();
    } catch (e) {
      toast(e.message || "Generation failed.", "error");
    } finally {
      setGenLoad(false);
    }
  };

  const addRow = () => setAmounts((a) => [...a, { amount: "", qty: "" }]);
  const removeRow = (i) => setAmounts((a) => a.filter((_, idx) => idx !== i));
  const updateRow = (i, field, val) =>
    setAmounts((a) =>
      a.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)),
    );

  return (
    <div className="adm-section">
      <div className="adm-section-header">
        <div className="adm-section-title-wrap">
          <div className="adm-section-icon adm-section-icon--amber">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 12V22H4V12" />
              <path d="M22 7H2v5h20V7z" />
              <path d="M12 22V7" />
              <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
            </svg>
          </div>
          <div>
            <h2 className="adm-section-title">Gift Cards</h2>
            <p className="adm-section-sub">
              Generate and manage gift card codes
            </p>
          </div>
        </div>
        <div className="adm-section-actions">
          <div className="adm-tabs">
            {["all", "active", "inactive"].map((f) => (
              <button
                key={f}
                className={`adm-tab ${filter === f ? "adm-tab--active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            className="adm-btn adm-btn--primary"
            onClick={() => {
              setShowGen((s) => !s);
              setGenerated(null);
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Generate
          </button>
        </div>
      </div>

      {/* Generate panel */}
      {showGen && (
        <div className="adm-gen-panel">
          <h4 className="adm-gen-title">Generate Gift Cards</h4>
          <div className="adm-gen-rows">
            {amounts.map((row, i) => (
              <div key={i} className="adm-gen-row">
                <div className="adm-field">
                  <label className="adm-label">Amount (NPR)</label>
                  <input
                    className="adm-input"
                    type="number"
                    min="1"
                    placeholder="e.g. 500"
                    value={row.amount}
                    onChange={(e) => updateRow(i, "amount", e.target.value)}
                  />
                </div>
                <div className="adm-field">
                  <label className="adm-label">Quantity</label>
                  <input
                    className="adm-input"
                    type="number"
                    min="1"
                    placeholder="e.g. 5"
                    value={row.qty}
                    onChange={(e) => updateRow(i, "qty", e.target.value)}
                  />
                </div>
                {amounts.length > 1 && (
                  <button
                    className="adm-remove-row"
                    onClick={() => removeRow(i)}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <button className="adm-add-row-btn" onClick={addRow}>
            + Add another denomination
          </button>

          <div className="adm-field adm-field--inline">
            <label className="adm-label">Max uses per card</label>
            <input
              className="adm-input adm-input--sm"
              type="number"
              min="1"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
            />
          </div>

          <button
            className="adm-btn adm-btn--primary"
            onClick={generate}
            disabled={genLoading}
          >
            {genLoading ? (
              <span className="adm-spinner adm-spinner--sm" />
            ) : null}
            {genLoading ? "Generating…" : "Generate Cards"}
          </button>

          {generated && (
            <div className="adm-gen-result">
              <p className="adm-gen-result-title">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {generated.total_generated} card(s) generated successfully
              </p>
              {Object.entries(generated.cards || {}).map(([amt, list]) => (
                <div key={amt} className="adm-gen-group">
                  <p className="adm-gen-group-label">NPR {amt}</p>
                  {list.map((c) => (
                    <div key={c.gift_card_id} className="adm-gen-code">
                      {c.code}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="adm-table-wrap">
        {loading ? (
          <SkeletonRows />
        ) : cards.length === 0 ? (
          <EmptyState
            icon={
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M20 12V22H4V12" />
                <path d="M22 7H2v5h20V7z" />
              </svg>
            }
            message="No gift cards found."
          />
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Amount</th>
                <th>Uses</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cards.map((c) => (
                <tr key={c.gift_card_id} className="adm-table-row">
                  <td className="adm-td-code">{c.code}</td>
                  <td className="adm-td-name">{fmtNPR(c.amount)}</td>
                  <td className="adm-td-sub">
                    {c.times_used} / {c.max_uses}
                  </td>
                  <td>
                    <StatusBadge status={c.is_active ? "active" : "inactive"} />
                  </td>
                  <td className="adm-td-sub">{fmtDate(c.created_at)}</td>
                  <td>
                    {c.is_active && (
                      <button
                        className="adm-row-btn adm-row-btn--danger"
                        onClick={() => deactivate(c.gift_card_id)}
                        disabled={deactivating === c.gift_card_id}
                      >
                        {deactivating === c.gift_card_id ? "…" : "Deactivate"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── SECTION: Card Requests ────────────────────────────────────
function CardRequestsSection({ toast }) {
  const [tab, setTab] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  // Activate form
  const [activateFor, setActivateFor] = useState(null);
  const [cardId, setCardId] = useState("");
  const [activating, setActivating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminListCardRequests(tab === "all" ? "" : tab);
      setRequests(res.requests || []);
    } catch (e) {
      toast(e.message || "Failed to load card requests.", "error");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const openActivate = (req) => {
    setActivateFor(req);
    setCardId("");
  };
  const closeActivate = () => {
    setActivateFor(null);
    setCardId("");
  };

  const activate = async () => {
    if (!cardId.trim())
      return toast("Please enter the physical card UID.", "error");
    setActivating(true);
    try {
      await adminActivateCard({
        card_id: cardId.trim().toUpperCase(),
        account_id: activateFor.account_id,
        request_id: activateFor.request_id,
      });
      toast("Card activated and linked to user.", "success");
      closeActivate();
      load();
    } catch (e) {
      toast(e.message || "Activation failed.", "error");
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="adm-section">
      <div className="adm-section-header">
        <div className="adm-section-title-wrap">
          <div className="adm-section-icon adm-section-icon--purple">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
          </div>
          <div>
            <h2 className="adm-section-title">Kharcha Card Requests</h2>
            <p className="adm-section-sub">
              Activate physical RFID cards for users
            </p>
          </div>
        </div>
        <div className="adm-tabs">
          {["pending", "approved", "rejected", "issued", "all"].map((t) => (
            <button
              key={t}
              className={`adm-tab ${tab === t ? "adm-tab--active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="adm-table-wrap">
        {loading ? (
          <SkeletonRows />
        ) : requests.length === 0 ? (
          <EmptyState
            icon={
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="1" y="4" width="22" height="16" rx="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            }
            message={`No ${tab} card requests.`}
          />
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Account ID</th>
                <th>Delivery Address</th>
                <th>Submitted</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.request_id} className="adm-table-row">
                  <td className="adm-td-code">{req.account_id}</td>
                  <td className="adm-td-sub">{req.delivery_address || "—"}</td>
                  <td className="adm-td-sub">{fmtDate(req.created_at)}</td>
                  <td>
                    <StatusBadge status={req.status} />
                  </td>
                  <td>
                    {(req.status === "pending" ||
                      req.status === "approved") && (
                      <button
                        className="adm-row-btn"
                        onClick={() => openActivate(req)}
                      >
                        Activate Card
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Activate modal */}
      {activateFor && (
        <div className="adm-modal-overlay" onClick={closeActivate}>
          <div
            className="adm-modal adm-modal--sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="adm-modal-header">
              <h3>Activate Physical Card</h3>
              <button className="adm-modal-close" onClick={closeActivate}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="adm-modal-body">
              <p className="adm-modal-hint">
                Enter the RC522 card UID after programming it. This will link it
                to account <code>{activateFor.account_id}</code>.
              </p>
              <div className="adm-field">
                <label className="adm-label">Card UID</label>
                <input
                  className="adm-input"
                  placeholder="e.g. A3B2C1D0"
                  value={cardId}
                  onChange={(e) => setCardId(e.target.value.toUpperCase())}
                  style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}
                />
              </div>
              <div className="adm-review-btns">
                <button
                  className="adm-btn adm-btn--approve"
                  onClick={activate}
                  disabled={activating || !cardId.trim()}
                >
                  {activating ? (
                    <span className="adm-spinner adm-spinner--sm" />
                  ) : null}
                  {activating ? "Activating…" : "Activate"}
                </button>
                <button
                  className="adm-btn adm-btn--ghost"
                  onClick={closeActivate}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main AdminDashboard ────────────────────────────────────────
export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("verification");
  const [toast, setToastState] = useState({ msg: "", type: "success" });
  const showToast = (msg, type = "success") => setToastState({ msg, type });

  const navItems = [
    {
      id: "verification",
      label: "KYC Verifications",
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
    },
    {
      id: "giftcards",
      label: "Gift Cards",
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M20 12V22H4V12" />
          <path d="M22 7H2v5h20V7z" />
          <path d="M12 22V7" />
        </svg>
      ),
    },
    {
      id: "cards",
      label: "Card Requests",
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      ),
    },
  ];

  return (
    <div className="adm-page">
      <Toast
        msg={toast.msg}
        type={toast.type}
        onDone={() => setToastState({ msg: "", type: "success" })}
      />

      <div className="adm-layout">
        {/* Sidebar nav */}
        <aside className="adm-nav">
          <div className="adm-nav-header">
            <div className="adm-nav-badge">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <p className="adm-nav-title">Admin Panel</p>
              <p className="adm-nav-sub">Kharcha</p>
            </div>
          </div>
          <nav className="adm-nav-links">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`adm-nav-link ${activeSection === item.id ? "adm-nav-link--active" : ""}`}
                onClick={() => setActiveSection(item.id)}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="adm-main">
          <div className="adm-main-header">
            <h1 className="adm-main-title">
              {navItems.find((n) => n.id === activeSection)?.label}
            </h1>
          </div>

          {activeSection === "verification" && (
            <VerificationSection toast={showToast} />
          )}
          {activeSection === "giftcards" && (
            <GiftCardSection toast={showToast} />
          )}
          {activeSection === "cards" && (
            <CardRequestsSection toast={showToast} />
          )}
        </main>
      </div>
    </div>
  );
}
