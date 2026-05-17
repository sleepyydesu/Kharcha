import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getWallet, transfer } from "../services/api";
import "./ServiceDetail.css";

// ── Service config ────────────────────────────────────────────
const SERVICE_CONFIG = {
  topup: {
    label: "Mobile Topup",
    accent: "#1a5c39",
    fields: [
      {
        key: "phone",
        label: "Mobile Number",
        placeholder: "98XXXXXXXX",
        type: "tel",
        maxLength: 10,
      },
      {
        key: "operator",
        label: "Operator",
        type: "select",
        options: ["Ncell", "NTC", "Smart Cell", "UTL"],
      },
    ],
    presets: [50, 100, 200, 500, 1000],
    amountLabel: "Topup Amount",
    remarks: (f) => `Mobile Topup – ${f.operator} – ${f.phone}`,
  },
  internet: {
    label: "Internet Bill",
    accent: "#1a56db",
    fields: [
      {
        key: "username",
        label: "Username / Customer ID",
        placeholder: "ISP username",
        type: "text",
      },
      {
        key: "provider",
        label: "Provider",
        type: "select",
        options: ["WorldLink", "Vianet", "Subisu", "Classic Tech", "Dish Home"],
      },
    ],
    presets: [500, 800, 1000, 1500, 2000],
    amountLabel: "Bill Amount",
    remarks: (f) => `Internet Bill – ${f.provider} – ${f.username}`,
  },
  landline: {
    label: "Landline Bill",
    accent: "#7c3aed",
    fields: [
      {
        key: "phone",
        label: "Landline Number",
        placeholder: "01XXXXXXX",
        type: "tel",
        maxLength: 9,
      },
      {
        key: "provider",
        label: "Provider",
        type: "select",
        options: ["Nepal Telecom", "Smart Telecom"],
      },
    ],
    presets: [200, 400, 600, 800, 1000],
    amountLabel: "Bill Amount",
    remarks: (f) => `Landline Bill – ${f.provider} – ${f.phone}`,
  },
  water: {
    label: "Water Bill",
    accent: "#0369a1",
    fields: [
      {
        key: "customer_id",
        label: "Customer ID",
        placeholder: "Enter customer ID",
        type: "text",
      },
      {
        key: "office",
        label: "Office",
        type: "select",
        options: [
          "KUKL",
          "NWSC Kathmandu",
          "NWSC Pokhara",
          "Municipality Water",
        ],
      },
    ],
    presets: [100, 200, 400, 600, 1000],
    amountLabel: "Bill Amount",
    remarks: (f) => `Water Bill – ${f.office} – ${f.customer_id}`,
  },
  electricity: {
    label: "Electricity Bill",
    accent: "#b45309",
    fields: [
      {
        key: "sc_no",
        label: "SC Number",
        placeholder: "Enter SC number",
        type: "text",
      },
      {
        key: "office",
        label: "NEA Office",
        type: "select",
        options: [
          "Kathmandu",
          "Lalitpur",
          "Bhaktapur",
          "Pokhara",
          "Chitwan",
          "Biratnagar",
        ],
      },
    ],
    presets: [500, 1000, 2000, 3000, 5000],
    amountLabel: "Bill Amount",
    remarks: (f) => `Electricity Bill – NEA ${f.office} – SC ${f.sc_no}`,
  },
  education: {
    label: "School / College Fee",
    accent: "#0f766e",
    fields: [
      {
        key: "student_id",
        label: "Student ID / Roll No.",
        placeholder: "Enter student ID",
        type: "text",
      },
      {
        key: "institution",
        label: "Institution Name",
        placeholder: "School or college name",
        type: "text",
      },
    ],
    presets: [1000, 2000, 5000, 10000, 20000],
    amountLabel: "Fee Amount",
    remarks: (f) => `Education Fee – ${f.institution} – ${f.student_id}`,
  },
};

// ── MPIN Overlay — same pattern as SendMoney ──────────────────
function MpinOverlay({ amount, label, onConfirm, onClose, submitting, error }) {
  const [mpin, setMpin] = useState("");
  const DIGITS = 6;
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  function tap(k) {
    if (submitting) return;
    if (k === "⌫") setMpin((v) => v.slice(0, -1));
    else if (mpin.length < DIGITS) setMpin((v) => v + k);
  }

  return (
    <div
      className="sd__backdrop"
      onClick={(e) => e.target === e.currentTarget && !submitting && onClose()}
    >
      <div className="sd__overlay">
        <div className="sd__overlay-handle" />
        <p className="sd__overlay-title">Enter MPIN</p>
        <p className="sd__overlay-sub">
          Confirm <strong>NPR {Number(amount).toLocaleString()}</strong> for{" "}
          {label}
        </p>
        <div className="sd__dots">
          {Array.from({ length: DIGITS }).map((_, i) => (
            <div
              key={i}
              className={`sd__dot${i < mpin.length ? " sd__dot--on" : ""}`}
            />
          ))}
        </div>
        {error && <p className="sd__overlay-err">{error}</p>}
        <div className="sd__pad">
          {keys.map((k, i) => (
            <button
              key={i}
              type="button"
              className={`sd__key${k === "" ? " sd__key--empty" : ""}${k === "⌫" ? " sd__key--del" : ""}`}
              onClick={() => k && tap(k)}
              disabled={submitting || k === ""}
            >
              {k}
            </button>
          ))}
        </div>
        <button
          className="sd__btn sd__btn--primary"
          onClick={() => onConfirm(mpin)}
          disabled={submitting || mpin.length < 4}
        >
          {submitting ? "Processing…" : "Confirm Payment"}
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function ServiceDetail() {
  const { type } = useParams();
  const navigate = useNavigate();
  const cfg = SERVICE_CONFIG[type];

  const [fields, setFields] = useState({});
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);

  const [showMpin, setShowMpin] = useState(false);
  const [mpinErr, setMpinErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // "form" | "success" | "error"  — only set to "success" after real API response
  const [view, setView] = useState("form");
  const [successData, setSuccessData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // ── Wallet load ───────────────────────────────────────────
  const fetchWallet = useCallback(async () => {
    try {
      const d = await getWallet();
      setWallet(d?.wallet ?? null);
    } catch {
      setWallet(null);
    } finally {
      setWalletLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  if (!cfg) {
    return (
      <div className="sd__page sd__page--center">
        <p className="sd__muted">Service not found.</p>
        <button
          className="sd__btn sd__btn--ghost"
          onClick={() => navigate("/services")}
        >
          ← Back
        </button>
      </div>
    );
  }

  const amtNum = parseFloat(amount) || 0;
  const balance = wallet ? parseFloat(wallet.balance) : 0;
  const allFilled = cfg.fields.every(
    (f) => (fields[f.key] || "").trim().length > 0,
  );
  const hasEnough = wallet !== null && amtNum > 0 && amtNum <= balance;
  const canPay = allFilled && amtNum > 0;

  // ── Transfer — identical logic to SendMoney.handleTransfer ─
  async function handleTransfer(mpin) {
    if (mpin.length < 4) {
      setMpinErr("Enter your MPIN (4–6 digits).");
      return;
    }

    // receiver_identifier: set VITE_SERVICE_RECEIVER_ID in .env to your
    // service/utility org account_id (UUID) or registered phone number.
    const receiver_identifier = import.meta.env.VITE_SERVICE_RECEIVER_ID;
    if (!receiver_identifier) {
      setMpinErr(
        "Service account not configured (VITE_SERVICE_RECEIVER_ID missing).",
      );
      return;
    }

    setSubmitting(true);
    setMpinErr("");
    try {
      const remarksStr = cfg.remarks(fields);
      // ── Real transfer call — same as SendMoney ──────────
      const res = await transfer({
        receiver_identifier,
        amount: amtNum,
        remarks: remarksStr,
        mpin,
      });
      // ── Only reach here on API success ─────────────────
      setShowMpin(false);

      // Refresh wallet — use balance_after from response if available,
      // otherwise re-fetch (same pattern as SendMoney)
      const balanceAfter = res?.transaction?.balance_after;
      if (balanceAfter !== undefined) {
        setWallet((prev) =>
          prev ? { ...prev, balance: parseFloat(balanceAfter) } : prev,
        );
      } else {
        fetchWallet();
      }

      setSuccessData({
        amount: amtNum,
        remarks: remarksStr,
        transaction_id: res?.transaction?.transaction_id ?? null,
        balance_after: balanceAfter,
      });
      setView("success");
    } catch (e) {
      const msg = e?.message || "Transfer failed.";
      // MPIN errors stay in overlay (same as SendMoney)
      if (/mpin|incorrect|wrong pin/i.test(msg)) {
        setMpinErr(msg);
      } else {
        setShowMpin(false);
        setErrorMsg(msg);
        setView("error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success ───────────────────────────────────────────────
  if (view === "success" && successData) {
    return (
      <div className="sd__page sd__page--center">
        <div className="sd__result">
          <div className="sd__result-ring" style={{ background: cfg.accent }}>
            ✓
          </div>
          <h2 className="sd__result-title">Payment Successful</h2>
          <p className="sd__result-sub">{cfg.label}</p>
          <p className="sd__result-remark">"{successData.remarks}"</p>
          <div className="sd__receipt">
            <div className="sd__receipt-row">
              <span>Amount</span>
              <strong>NPR {successData.amount.toLocaleString()}</strong>
            </div>
            {successData.balance_after !== undefined && (
              <div className="sd__receipt-row">
                <span>New Balance</span>
                <strong>
                  NPR{" "}
                  {parseFloat(successData.balance_after).toLocaleString(
                    "en-NP",
                    { minimumFractionDigits: 2 },
                  )}
                </strong>
              </div>
            )}
            {successData.transaction_id && (
              <div className="sd__receipt-row">
                <span>Ref</span>
                <code className="sd__ref">
                  {successData.transaction_id.slice(0, 8).toUpperCase()}
                </code>
              </div>
            )}
          </div>
          <button
            className="sd__btn sd__btn--primary"
            style={{ background: cfg.accent }}
            onClick={() => navigate("/services")}
          >
            Done
          </button>
          <button
            className="sd__btn sd__btn--ghost"
            onClick={() => navigate("/statements")}
          >
            View Statement
          </button>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────
  if (view === "error") {
    return (
      <div className="sd__page sd__page--center">
        <div className="sd__result">
          <div className="sd__result-ring sd__result-ring--err">✕</div>
          <h2 className="sd__result-title">Payment Failed</h2>
          <p className="sd__result-sub">{errorMsg}</p>
          <button
            className="sd__btn sd__btn--primary"
            onClick={() => {
              setErrorMsg("");
              setView("form");
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────
  return (
    <div className="sd__page">
      {/* Header */}
      <div className="sd__header">
        <button
          className="sd__icon-btn"
          onClick={() => navigate("/services")}
          aria-label="Back"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="sd__accent-dot" style={{ background: cfg.accent }} />
        <h1 className="sd__title">{cfg.label}</h1>
      </div>

      <div className="sd__body">
        {/* Wallet balance */}
        <div className="sd__balance-bar">
          <span className="sd__balance-label">Wallet Balance</span>
          {walletLoading ? (
            <span className="sd__skel" />
          ) : wallet ? (
            <span className="sd__balance-val">
              NPR{" "}
              {parseFloat(wallet.balance).toLocaleString("en-NP", {
                minimumFractionDigits: 2,
              })}
            </span>
          ) : (
            <span className="sd__balance-err">
              Unavailable —{" "}
              <button className="sd__link-btn" onClick={fetchWallet}>
                retry
              </button>
            </span>
          )}
        </div>

        {/* Service-specific fields */}
        <div className="sd__card">
          {cfg.fields.map((f) =>
            f.type === "select" ? (
              <div key={f.key} className="sd__field">
                <label className="sd__label">{f.label}</label>
                <select
                  className="sd__select"
                  value={fields[f.key] || ""}
                  onChange={(e) =>
                    setFields((p) => ({ ...p, [f.key]: e.target.value }))
                  }
                >
                  <option value="">Select {f.label}</option>
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div key={f.key} className="sd__field">
                <label className="sd__label">{f.label}</label>
                <input
                  className="sd__input"
                  type={f.type}
                  placeholder={f.placeholder}
                  value={fields[f.key] || ""}
                  maxLength={f.maxLength}
                  onChange={(e) =>
                    setFields((p) => ({ ...p, [f.key]: e.target.value }))
                  }
                />
              </div>
            ),
          )}
        </div>

        {/* Amount + presets */}
        <div className="sd__card">
          <div className="sd__field">
            <label className="sd__label">{cfg.amountLabel}</label>
            <div className="sd__amount-row">
              <span className="sd__currency">NPR</span>
              <input
                className="sd__amount-input"
                type="number"
                min="1"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            {wallet && amtNum > 0 && amtNum > balance && (
              <p className="sd__field-err">Insufficient wallet balance.</p>
            )}
          </div>
          <div className="sd__presets">
            {cfg.presets.map((p) => (
              <button
                key={p}
                type="button"
                className={`sd__preset${amtNum === p ? " sd__preset--on" : ""}`}
                style={
                  amtNum === p
                    ? { borderColor: cfg.accent, color: cfg.accent }
                    : {}
                }
                onClick={() => setAmount(String(p))}
              >
                {p.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Pay button */}
        <button
          type="button"
          className="sd__btn sd__btn--primary sd__btn--pay"
          style={canPay && hasEnough ? { background: cfg.accent } : {}}
          disabled={!canPay || !hasEnough}
          onClick={() => {
            setMpinErr("");
            setShowMpin(true);
          }}
        >
          Pay NPR {amtNum > 0 ? amtNum.toLocaleString() : "—"}
        </button>
      </div>

      {/* MPIN overlay */}
      {showMpin && (
        <MpinOverlay
          amount={amtNum}
          label={cfg.label}
          onConfirm={handleTransfer}
          onClose={() => !submitting && setShowMpin(false)}
          submitting={submitting}
          error={mpinErr}
        />
      )}
    </div>
  );
}
