import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getWallet, transfer } from "../../services/api";
import "./services.css";

export function BackArrow() {
  return (
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
  );
}

function CheckCircleIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
      <line x1="18" y1="9" x2="12" y2="15" />
      <line x1="12" y1="9" x2="18" y2="15" />
    </svg>
  );
}

function MpinDots({ value }) {
  return (
    <div className="sp-mpin-dots">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`sp-mpin-dot${i < value.length ? " sp-mpin-dot--on" : ""}`}
        />
      ))}
    </div>
  );
}

function Numpad({ onPress, disabled }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
  return (
    <div className="sp-numpad">
      {keys.map((k, i) => (
        <button
          key={i}
          className={`sp-numpad-key${k === "" ? " sp-numpad-key--empty" : ""}${k === "del" ? " sp-numpad-key--del" : ""}`}
          onClick={() => k !== "" && onPress(k)}
          disabled={disabled || k === ""}
          type="button"
        >
          {k === "del" ? <DeleteIcon /> : k}
        </button>
      ))}
    </div>
  );
}

/**
 * @param {string}   props.title
 * @param {string}   props.accent
 * @param {string}   props.note
 * @param {number[]} props.presets
 * @param {string}   props.amountLabel
 * @param {React.ReactNode} props.fields
 * @param {boolean}  props.fieldsValid
 * @param {Function} props.getRemarks   - () => string — called at submit time
 * @param {string|Function} props.receiverIdentifier - Phone/email of receiver, or function that returns it
 */
export default function ServicePage({
  title,
  accent = "var(--primary)",
  note,
  presets = [],
  amountLabel = "Amount",
  fields,
  fieldsValid,
  getRemarks,
  receiverIdentifier,
}) {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWL] = useState(true);
  const [step, setStep] = useState("form"); // form | mpin | success | error
  const [mpin, setMpin] = useState("");
  const [mpinErr, setMpinErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [successData, setSuc] = useState(null);
  const [errorMsg, setErr] = useState("");

  const fetchWallet = useCallback(async () => {
    try {
      const d = await getWallet();
      setWallet(d?.wallet ?? null);
    } catch {
      setWallet(null);
    } finally {
      setWL(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  useEffect(() => {
    if (step !== "mpin") return;
    const h = (e) => {
      if (e.key >= "0" && e.key <= "9")
        setMpin((p) => (p.length < 6 ? p + e.key : p));
      if (e.key === "Backspace") setMpin((p) => p.slice(0, -1));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [step]);

  const amtNum = parseFloat(amount) || 0;
  const balance = wallet ? parseFloat(wallet.balance) : 0;
  const enoughBalance = wallet && amtNum > 0 && amtNum <= balance;
  const formOk = fieldsValid && amtNum > 0;

  function goMpin() {
    if (!formOk || !enoughBalance) return;
    setMpin("");
    setMpinErr("");
    setStep("mpin");
  }

  function numpadPress(k) {
    if (k === "del") {
      setMpin((p) => p.slice(0, -1));
      return;
    }
    setMpin((p) => (p.length < 6 ? p + k : p));
  }

  async function confirm() {
    if (mpin.length < 4 || busy) return;

    // Get receiver identifier (can be a string or a function that returns a string)
    const receiver_identifier = typeof receiverIdentifier === 'function' 
      ? receiverIdentifier() 
      : receiverIdentifier;

    if (!receiver_identifier) {
      setMpinErr("Service receiver not configured.");
      return;
    }

    setBusy(true);
    setMpinErr("");
    try {
      const remarksStr = getRemarks ? getRemarks() : title;
      const res = await transfer({
        receiver_identifier,
        amount: amtNum,
        remarks: remarksStr,
        mpin,
      });

      // Refresh wallet balance
      const balanceAfter = res?.transaction?.balance_after;
      if (balanceAfter !== undefined) {
        setWallet((prev) =>
          prev ? { ...prev, balance: parseFloat(balanceAfter) } : prev,
        );
      } else {
        fetchWallet();
      }

      setSuc({
        amount: amtNum,
        remarks: remarksStr,
        transaction_id: res?.transaction?.transaction_id ?? null,
        balance_after: balanceAfter,
      });
      setStep("success");
    } catch (e) {
      const msg = e?.message || "Transfer failed.";
      if (/mpin|incorrect|wrong pin/i.test(msg)) {
        setMpinErr(msg);
        setMpin("");
      } else {
        setErr(msg || "Payment failed. Please try again.");
        setStep("error");
      }
    } finally {
      setBusy(false);
    }
  }

  // ── Success ──────────────────────────────────────────────
  if (step === "success" && successData)
    return (
      <div className="sp-page">
        <div className="sp-center-wrap">
          <div className="sp-success-icon" style={{ color: accent }}>
            <CheckCircleIcon />
          </div>
          <h2 className="sp-center-title">Payment Successful</h2>
          <p className="sp-center-sub">{title}</p>
          <div className="sp-result-card">
            <div className="sp-result-row">
              <span className="sp-result-key">Amount</span>
              <span className="sp-result-val">
                NPR {successData.amount.toLocaleString()}
              </span>
            </div>
            {successData.balance_after !== undefined && (
              <div className="sp-result-row">
                <span className="sp-result-key">New Balance</span>
                <span className="sp-result-val">
                  NPR{" "}
                  {parseFloat(successData.balance_after).toLocaleString(
                    "en-NP",
                    { minimumFractionDigits: 2 },
                  )}
                </span>
              </div>
            )}
            {successData.transaction_id && (
              <div className="sp-result-row">
                <span className="sp-result-key">Reference</span>
                <span className="sp-result-val sp-result-mono">
                  {successData.transaction_id.slice(0, 8).toUpperCase()}
                </span>
              </div>
            )}
            <div className="sp-result-row">
              <span className="sp-result-key">Details</span>
              <span
                className="sp-result-val"
                style={{ fontSize: "0.76rem", opacity: 0.8 }}
              >
                {successData.remarks}
              </span>
            </div>
          </div>
          <button
            className="sp-done-btn"
            style={{ background: accent }}
            onClick={() => navigate("/services")}
          >
            Done
          </button>
          <button
            className="sp-done-btn sp-done-btn--ghost"
            onClick={() => navigate("/statements")}
          >
            View Statement
          </button>
        </div>
      </div>
    );

  // ── Error ────────────────────────────────────────────────
  if (step === "error")
    return (
      <div className="sp-page">
        <div className="sp-center-wrap">
          <div className="sp-error-icon">✕</div>
          <h2 className="sp-center-title">Payment Failed</h2>
          <p className="sp-center-sub">{errorMsg}</p>
          <button
            className="sp-done-btn"
            style={{ background: accent }}
            onClick={() => {
              setErr("");
              setStep("form");
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );

  // ── MPIN ─────────────────────────────────────────────────
  if (step === "mpin")
    return (
      <div className="sp-page">
        <div className="sp-mpin-wrap">
          <button
            className="sp-back"
            onClick={() => setStep("form")}
            type="button"
          >
            <BackArrow />
          </button>
          <div className="sp-mpin-badge" style={{ color: accent }}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h3 className="sp-mpin-title">Enter MPIN</h3>
          <p className="sp-mpin-sub">
            Confirm <strong>NPR {amtNum.toLocaleString()}</strong> payment for{" "}
            {title}
          </p>
          <MpinDots value={mpin} />
          {mpinErr && <p className="sp-mpin-err">{mpinErr}</p>}
          <Numpad onPress={numpadPress} disabled={busy} />
          <button
            className="sp-confirm-btn"
            style={{
              background: mpin.length >= 4 && !busy ? accent : undefined,
            }}
            onClick={confirm}
            disabled={mpin.length < 4 || busy}
            type="button"
          >
            {busy ? "Processing…" : "Confirm Payment"}
          </button>
        </div>
      </div>
    );

  // ── Form ─────────────────────────────────────────────────
  return (
    <div className="sp-page">
      <div className="sp-header">
        <button
          className="sp-back"
          onClick={() => navigate("/services")}
          type="button"
        >
          <BackArrow />
        </button>
        <span className="sp-header-dot" style={{ background: accent }} />
        <h1 className="sp-header-title">{title}</h1>
      </div>

      <div className="sp-body">
        <div className="sp-balance">
          <span className="sp-balance-label">Wallet Balance</span>
          {walletLoading ? (
            <span className="sp-balance-skel" />
          ) : wallet ? (
            <span className="sp-balance-val">
              NPR{" "}
              {parseFloat(wallet.balance).toLocaleString("en-NP", {
                minimumFractionDigits: 2,
              })}
            </span>
          ) : (
            <span className="sp-balance-na">
              Unavailable —{" "}
              <button
                className="sp-link-btn"
                onClick={fetchWallet}
                type="button"
              >
                retry
              </button>
            </span>
          )}
        </div>

        <div className="sp-section">{fields}</div>

        <div className="sp-section">
          <div className="sp-field">
            <label className="sp-label">{amountLabel}</label>
            <div
              className={`sp-amount-wrap${amtNum > balance && wallet ? " sp-amount-wrap--err" : ""}`}
            >
              <span className="sp-amount-curr">NPR</span>
              <input
                className="sp-amount-input"
                type="number"
                min="1"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            {wallet && amtNum > balance && amtNum > 0 && (
              <p className="sp-field-err">Insufficient balance.</p>
            )}
          </div>
          <div className="sp-presets">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                className={`sp-preset${amtNum === p ? " sp-preset--on" : ""}`}
                style={
                  amtNum === p ? { borderColor: accent, color: accent } : {}
                }
                onClick={() => setAmount(String(p))}
              >
                {p.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {note && <p className="sp-note">{note}</p>}

        <button
          className="sp-submit"
          style={{ background: formOk && enoughBalance ? accent : undefined }}
          onClick={goMpin}
          disabled={!formOk || !enoughBalance}
          type="button"
        >
          Pay NPR {amtNum > 0 ? amtNum.toLocaleString() : "—"}
        </button>
      </div>
    </div>
  );
}