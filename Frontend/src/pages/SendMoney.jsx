import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  transfer,
  lookupReceiver,
  getTransactionCategories,
  biometricVerifyTransactionApi,
  getKharchaGroupPaymentContext,
  settleKharchaGroupSplit,
} from "../services/api";
import CategoryIcon from "../components/CategoryIcon";
import fingerprintIcon from "../assets/fingerprintIcon.svg";
import {
  isBiometricAvailable,
  getSavedBiometricTxUser,
  biometricTxLogin,
  clearSavedBiometricTxUser,
} from "../hooks/useBiometric";
import "./SendMoney.css";

// Infer icon_type from URL extension so CategoryIcon knows which render mode to use.
function detectIconType(url) {
  if (!url) return "png";
  return /\.svg(\?|$)/i.test(url) ? "svg" : "png";
}

function BackArrow() {
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
function UserIcon() {
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
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function QRIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="3" height="3" />
      <rect x="17" y="17" width="3" height="3" />
    </svg>
  );
}
function StoreIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

const PRESETS = [100, 500, 1000, 2000, 5000];

// ── Helpers ───────────────────────────────────────────────────
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUUID(val) {
  return UUID_RE.test((val ?? "").trim());
}

function normalisePhone(raw) {
  const val = (raw ?? "").trim();
  if (!val || isUUID(val)) return val;
  if (val.startsWith("+")) return val;
  if (val.startsWith("977") && val.length > 10) return "+" + val;
  return "+977" + val;
}

// ── MPIN overlay ──────────────────────────────────────────────
function MpinOverlay({
  amount,
  receiverName,
  onConfirm,
  onClose,
  submitting,
  error,
}) {
  const [mpin, setMpin] = useState("");
  const DIGITS = 6;
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  function handleKey(k) {
    if (submitting) return;
    if (k === "⌫") setMpin((v) => v.slice(0, -1));
    else if (mpin.length < DIGITS) setMpin((v) => v + k);
  }

  return (
    <div
      className="sm__overlay-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="sm__overlay">
        <div className="sm__overlay-handle" />
        <div className="sm__overlay-header">
          <p className="sm__overlay-title">Enter MPIN</p>
          <p className="sm__overlay-sub">
            Confirm sending{" "}
            <strong>NPR {Number(amount).toLocaleString()}</strong>
            {receiverName ? ` to ${receiverName}` : ""}
          </p>
        </div>
        <div className="sm__mpin-dots">
          {Array.from({ length: DIGITS }).map((_, i) => (
            <div
              key={i}
              className={`sm__mpin-dot${i < mpin.length ? " sm__mpin-dot--filled" : ""}`}
            />
          ))}
        </div>
        {error && <p className="sm__overlay-err">{error}</p>}
        <div className="sm__mpin-pad">
          {keys.map((k, i) => (
            <button
              key={i}
              type="button"
              className={`sm__mpin-key${k === "" ? " sm__mpin-key--empty" : ""}${k === "⌫" ? " sm__mpin-key--del" : ""}`}
              onClick={() => k && handleKey(k)}
              disabled={submitting || k === ""}
            >
              {k}
            </button>
          ))}
        </div>
        <button
          className="sm__btn sm__btn--primary sm__btn--send"
          onClick={() => onConfirm(mpin)}
          disabled={submitting || mpin.length < DIGITS}
        >
          {submitting ? "Transferring…" : "Confirm Transfer"}
        </button>
      </div>
    </div>
  );
}

export default function SendMoney() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const qrId = searchParams.get("id") || "";
  const qrName = searchParams.get("name") || "";
  const qrAmount = searchParams.get("amount") || "";
  const qrNote = searchParams.get("note") || "";
  const qrCodeId = searchParams.get("qr_id") || "";
  const defaultCategoryId = searchParams.get("default_category_id") || "";
  const defaultCategoryName = searchParams.get("default_category_name") || "";
  const groupSplitId = searchParams.get("group_split_id") || "";

  const fromDynamicQR = Boolean(qrCodeId);
  const fromGroup = Boolean(groupSplitId);
  const amountLocked = fromGroup || (fromDynamicQR && Boolean(qrAmount));

  const [view, setView] = useState(qrId ? "amount" : "phone");
  const [phone, setPhone] = useState(qrId);
  const [receiver, setReceiver] = useState(
    qrId && qrName ? { display_name: qrName, account_id: qrId } : null,
  );
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupErr, setLookupErr] = useState("");

  const [amount, setAmount] = useState(qrAmount);
  const [showExtra, setShowExtra] = useState(!!qrAmount);
  const [categories, setCategories] = useState([]);
  const [catsLoading, setCatsLoading] = useState(false);
  const [selectedCat, setSelectedCat] = useState(
    defaultCategoryId && defaultCategoryName
      ? { category_id: Number(defaultCategoryId), name: defaultCategoryName }
      : null,
  );
  const [remarks, setRemarks] = useState(qrNote);
  const [remarksErr, setRemarksErr] = useState("");

  const [showMpin, setShowMpin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const [groupSettlementWarning, setGroupSettlementWarning] = useState("");
  const [groupReturnTo, setGroupReturnTo] = useState("");
  const [groupContextLoading, setGroupContextLoading] = useState(fromGroup);

  // Biometric payment state — checked once on mount
  const [biometricTxReady, setBiometricTxReady] = useState(false);
  const [biometricSubmitting, setBiometricSubmitting] = useState(false);

  useEffect(() => {
    async function checkBiometric() {
      const available = await isBiometricAvailable();
      if (!available) return;
      if (getSavedBiometricTxUser()) setBiometricTxReady(true);
    }
    checkBiometric();
  }, []);

  useEffect(() => {
    // If we came from a QR scan with a name already resolved, skip lookup.
    // If we have an id but no name, look it up — but only if it's a phone number,
    // not a UUID (UUIDs are passed directly to the transfer API).
    if (qrId && !qrName && !isUUID(qrId)) doLookup(qrId, true);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!groupSplitId) return;
    setGroupContextLoading(true);
    getKharchaGroupPaymentContext(groupSplitId)
      .then((data) => {
        const payment = data.payment;
        setPhone(payment.receiver.account_id);
        setReceiver(payment.receiver);
        setAmount(String(payment.amount));
        setRemarks(payment.note);
        setShowExtra(true);
        setGroupReturnTo(payment.group.return_to);
        setView("amount");
      })
      .catch((error) => {
        setLookupErr(error.message || "Could not load this group payment.");
        setView("phone");
      })
      .finally(() => setGroupContextLoading(false));
  }, [groupSplitId]);

  useEffect(() => {
    if (showExtra && categories.length === 0) {
      setCatsLoading(true);
      getTransactionCategories()
        .then((d) => {
          const cats = d?.categories || [];
          setCategories(cats);
          if (defaultCategoryId && !selectedCat) {
            const found = cats.find(
              (c) => String(c.category_id) === String(defaultCategoryId),
            );
            if (found) setSelectedCat(found);
          }
        })
        .catch(() => setCategories([]))
        .finally(() => setCatsLoading(false));
    }
  }, [showExtra]); // eslint-disable-line

  async function doLookup(id, silent = false) {
    const val = normalisePhone(id ?? phone);
    if (!val) return;
    setLookingUp(true);
    setLookupErr("");
    try {
      const d = await lookupReceiver(val);
      setReceiver(d?.receiver || d);
      if (!silent) setView("amount");
    } catch (e) {
      setLookupErr(e.message || "User not found.");
      setReceiver(null);
    } finally {
      setLookingUp(false);
    }
  }

  function handlePhoneLookup() {
    const val = (phone ?? "").trim();
    // If it's not a UUID, validate as 10-digit Nepali phone
    if (!isUUID(val)) {
      if (!/^(97|98)\d{8}$/.test(val)) {
        setLookupErr("Enter a valid 10-digit mobile number.");
        return;
      }
    }
    doLookup();
  }

  function handleAmountProceed() {
    if (!parseFloat(amount) || parseFloat(amount) < 1) return;
    setShowExtra(true);
  }

  function handleContinue() {
    if (!remarks.trim()) {
      setRemarksErr(
        "Remarks are required — describe the purpose of this payment.",
      );
      return;
    }
    setRemarksErr("");
    setView("confirm");
  }

  async function settleGroupPayment(result) {
    if (!groupSplitId) return;
    const transactionId = result?.transaction?.transaction_id;
    if (!transactionId) {
      setGroupSettlementWarning(
        "Money was sent, but the group share could not be updated automatically.",
      );
      return;
    }
    try {
      await settleKharchaGroupSplit(groupSplitId, transactionId);
    } catch (error) {
      setGroupSettlementWarning(
        error.message ||
          "Money was sent, but the group share could not be updated automatically.",
      );
    }
  }

  async function handleTransfer(mpin) {
    if (mpin.length !== 6) {
      setSubmitErr("Enter your 6-digit MPIN.");
      return;
    }
    setSubmitting(true);
    setSubmitErr("");
    try {
      const receiver_identifier = normalisePhone(phone) || receiver?.account_id;
      const result = await transfer({
        receiver_identifier,
        amount: parseFloat(amount),
        ...(selectedCat ? { category_id: selectedCat.category_id } : {}),
        remarks: remarks.trim(),
        ...(qrCodeId ? { qr_id: qrCodeId } : {}),
        ...(groupSplitId ? { group_split_id: groupSplitId } : {}),
        mpin,
      });
      await settleGroupPayment(result);
      setShowMpin(false);
      setView("success");
    } catch (e) {
      setSubmitErr(e.message || "Transfer failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBiometricTransfer() {
    setBiometricSubmitting(true);
    setSubmitErr("");
    try {
      const { biometric_token } = await biometricTxLogin(
        biometricVerifyTransactionApi,
      );
      const receiver_identifier = normalisePhone(phone) || receiver?.account_id;
      const result = await transfer({
        receiver_identifier,
        amount: parseFloat(amount),
        ...(selectedCat ? { category_id: selectedCat.category_id } : {}),
        remarks: remarks.trim(),
        ...(qrCodeId ? { qr_id: qrCodeId } : {}),
        ...(groupSplitId ? { group_split_id: groupSplitId } : {}),
        biometric_token,
      });
      await settleGroupPayment(result);
      setView("success");
    } catch (e) {
      // Clear stale credential if it's no longer valid
      if (e.message?.includes("Credential not found")) {
        clearSavedBiometricTxUser();
        setBiometricTxReady(false);
      }
      if (e.name === "NotAllowedError") {
        setSubmitErr("Fingerprint verification was cancelled.");
      } else {
        setSubmitErr(
          e.message || "Biometric transfer failed. Try entering MPIN instead.",
        );
      }
    } finally {
      setBiometricSubmitting(false);
    }
  }

  function goBack() {
    if (showMpin) {
      setShowMpin(false);
      return;
    }
    if (view === "confirm") {
      setView("amount");
      return;
    }
    if (view === "amount") {
      if (fromGroup) {
        navigate(groupReturnTo || -1);
        return;
      }
      setView("phone");
      return;
    }
    navigate(-1);
  }

  // ── Success ───────────────────────────────────────────────
  if (view === "success") {
    return (
      <div className="sm sm--centered">
        <div className="sm__success">
          <div className="sm__success-ring">✓</div>
          <h2 className="sm__success-title">Sent!</h2>
          <p className="sm__success-line">
            NPR <strong>{Number(amount).toLocaleString()}</strong> sent
            {receiver?.display_name ? ` to ${receiver.display_name}` : ""}
          </p>
          <p className="sm__success-remark">"{remarks.trim()}"</p>
          {groupSettlementWarning && (
            <p className="sm__submit-err">{groupSettlementWarning}</p>
          )}
          {fromGroup && groupReturnTo && (
            <button
              className="sm__btn sm__btn--primary"
              onClick={() => navigate(groupReturnTo)}
            >
              Back to Group
            </button>
          )}
          <button
            className={`sm__btn ${fromGroup ? "sm__btn--ghost" : "sm__btn--primary"}`}
            onClick={() => navigate("/statements")}
          >
            View Statement
          </button>
          {!fromGroup && <button
            className="sm__btn sm__btn--ghost"
            onClick={() => navigate("/")}
          >
            Back to Home
          </button>}
        </div>
      </div>
    );
  }

  // ── Confirm view ──────────────────────────────────────────
  if (view === "confirm") {
    return (
      <div className="sm">
        <button className="sm__back" onClick={goBack}>
          <BackArrow /> Back
        </button>
        <h1 className="sm__heading">Review Transfer</h1>
        <div className="sm__confirm-hero">
          <span className="sm__confirm-hero-currency">NPR</span>
          <span className="sm__confirm-hero-value">
            {Number(amount).toLocaleString()}
          </span>
        </div>
        <div className="sm__confirm-card">
          <div className="sm__confirm-row">
            <span className="sm__confirm-key">To</span>
            <span className="sm__confirm-val">
              {receiver?.display_name || "—"}
              {(receiver?.phone_number || (!isUUID(phone) && phone)) && (
                <small className="sm__confirm-phone">
                  {" "}
                  · {receiver?.phone_number || phone}
                </small>
              )}
            </span>
          </div>
          {selectedCat && (
            <div className="sm__confirm-row">
              <span className="sm__confirm-key">Category</span>
              <span className="sm__confirm-val">{selectedCat.name}</span>
            </div>
          )}
          <div className="sm__confirm-row">
            <span className="sm__confirm-key">Remarks</span>
            <span className="sm__confirm-val sm__confirm-val--remark">
              "{remarks.trim()}"
            </span>
          </div>
          <div className="sm__confirm-row">
            <span className="sm__confirm-key">Method</span>
            <span className="sm__confirm-val">Kharcha Wallet</span>
          </div>
          {fromDynamicQR && (
            <div className="sm__confirm-row">
              <span className="sm__confirm-key">Via</span>
              <span
                className="sm__confirm-val"
                style={{ display: "flex", alignItems: "center", gap: "5px" }}
              >
                <StoreIcon /> Merchant QR
              </span>
            </div>
          )}
        </div>

        {submitErr && <p className="sm__submit-err">{submitErr}</p>}

        {biometricTxReady && (
          <button
            className="sm__btn sm__btn--biometric"
            onClick={handleBiometricTransfer}
            disabled={biometricSubmitting || submitting}
            type="button"
          >
            {biometricSubmitting ? (
              <span className="sm__biometric-spinner" />
            ) : (
              <img
                src={fingerprintIcon}
                alt=""
                aria-hidden="true"
                className="sm__biometric-icon"
              />
            )}
            <span>
              {biometricSubmitting ? "Verifying…" : "Pay using Fingerprint"}
            </span>
          </button>
        )}

        {biometricTxReady && (
          <div className="sm__or-divider">
            <span>or</span>
          </div>
        )}

        <button
          className="sm__btn sm__btn--primary sm__btn--send"
          onClick={() => {
            setSubmitErr("");
            setShowMpin(true);
          }}
          disabled={biometricSubmitting}
        >
          Confirm &amp; Enter MPIN
        </button>

        {showMpin && (
          <MpinOverlay
            amount={amount}
            receiverName={receiver?.display_name}
            onConfirm={handleTransfer}
            onClose={() => setShowMpin(false)}
            submitting={submitting}
            error={submitErr}
          />
        )}
      </div>
    );
  }

  // ── Phone view ────────────────────────────────────────────
  if (view === "phone") {
    if (fromGroup && groupContextLoading) {
      return (
        <div className="sm sm--centered">
          <div className="sm__success">
            <span className="sm__biometric-spinner" />
            <h2 className="sm__success-title">Preparing group payment…</h2>
          </div>
        </div>
      );
    }
    if (fromGroup && lookupErr && !receiver) {
      return (
        <div className="sm sm--centered">
          <div className="sm__success">
            <div className="sm__success-ring" style={{ color: "#c33" }}>!</div>
            <h2 className="sm__success-title">Payment unavailable</h2>
            <p className="sm__submit-err">{lookupErr}</p>
            <button className="sm__btn sm__btn--primary" onClick={() => navigate(-1)}>
              Back to Group
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="sm">
        <button className="sm__back" onClick={() => navigate(-1)}>
          <BackArrow /> Back
        </button>
        <h1 className="sm__heading">Send Money</h1>
        <p className="sm__sub">Transfer funds to any Kharcha user</p>
        <div className="sm__field">
          <label className="sm__label">Mobile Number</label>
          <div
            className={`sm__input-row${lookupErr ? " sm__input-row--err" : ""}`}
          >
            <UserIcon />
            <input
              className="sm__input"
              type="tel"
              inputMode="numeric"
              placeholder="98XXXXXXXX"
              value={phone}
              autoFocus
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                if (val.length > 10) return;
                setPhone(val);
                setLookupErr("");
              }}
              onKeyDown={(e) => {
                const ctrl = [
                  "Backspace",
                  "Delete",
                  "Tab",
                  "ArrowLeft",
                  "ArrowRight",
                  "Home",
                  "End",
                ];
                if (ctrl.includes(e.key)) return;
                if (!/^\d$/.test(e.key)) {
                  e.preventDefault();
                  return;
                }
                if (phone.length >= 10) {
                  e.preventDefault();
                  return;
                }
                if (e.key === "Enter" && !lookingUp && phone.trim())
                  handlePhoneLookup();
              }}
            />
          </div>
          {lookupErr && <p className="sm__field-err">{lookupErr}</p>}
        </div>
        <button
          className="sm__btn sm__btn--primary"
          onClick={handlePhoneLookup}
          disabled={lookingUp || !phone.trim()}
        >
          {lookingUp ? "Looking up…" : "Proceed"}
        </button>
      </div>
    );
  }

  // ── Amount view ───────────────────────────────────────────
  return (
    <div className="sm">
      <button className="sm__back" onClick={goBack}>
        <BackArrow /> Back
      </button>
      <h1 className="sm__heading">Send Money</h1>

      {fromDynamicQR && (
        <div className="sm__qr-banner sm__qr-banner--merchant">
          <StoreIcon /> Merchant QR · payment details auto-filled
        </div>
      )}
      {qrId && !fromDynamicQR && (
        <div className="sm__qr-banner">
          {fromGroup ? <UserIcon /> : <QRIcon />}
          {fromGroup ? " Group share · details securely pre-filled" : " Details filled from QR scan"}
        </div>
      )}

      {receiver && (
        <div className="sm__receiver-chip">
          <div className="sm__receiver-avatar">
            {receiver.profile_picture ? (
              <img src={receiver.profile_picture} alt="" />
            ) : (
              <UserIcon />
            )}
          </div>
          <div className="sm__receiver-info">
            <div className="sm__receiver-name">
              {receiver.display_name || "Unknown"}
            </div>
            <div className="sm__receiver-phone">
              {receiver.phone_number || (!isUUID(phone) ? phone : "")}
            </div>
          </div>
          <div className="sm__receiver-verified">
            <CheckIcon />
          </div>
        </div>
      )}

      <div className="sm__field">
        <label className="sm__label">Amount (NPR)</label>
        <div className="sm__amount-row">
          <span className="sm__prefix">रू</span>
          <input
            className={`sm__input sm__input--amount${amountLocked ? " sm__input--locked" : ""}`}
            type="number"
            inputMode="decimal"
            min="1"
            placeholder="0.00"
            value={amount}
            autoFocus={!qrAmount}
            readOnly={amountLocked}
            onKeyDown={(e) => {
              // type="number" allows e/E (scientific notation) and +/- by default — block them
              if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
            }}
            onChange={(e) => {
              if (amountLocked) return;
              setAmount(e.target.value);
              if (showExtra) setShowExtra(false);
            }}
          />
        </div>
        {amountLocked ? (
          <p className="sm__field-hint">
            {fromDynamicQR
              ? "Amount fixed by merchant."
              : fromGroup
                ? "Amount fixed for your group bill share."
                : "Amount is fixed for this payment."}
          </p>
        ) : (
          <div className="sm__presets">
            {PRESETS.map((p) => (
              <button
                key={p}
                className="sm__preset"
                onClick={() => {
                  setAmount(String((parseFloat(amount) || 0) + p));
                  setShowExtra(false);
                }}
              >
                {p.toLocaleString()}
              </button>
            ))}
          </div>
        )}
      </div>

      {!showExtra && (
        <button
          className="sm__btn sm__btn--primary"
          onClick={handleAmountProceed}
          disabled={!parseFloat(amount) || parseFloat(amount) < 1}
        >
          Proceed
        </button>
      )}

      {showExtra && (
        <div className="sm__extra">
          <div className="sm__extra-divider">
            <span>Category &amp; Remarks</span>
          </div>

          {catsLoading ? (
            <div className="sm__cats-loading">Loading categories…</div>
          ) : (
            <div className="sm__cats-grid">
              <button
                className={`sm__cat-item${!selectedCat ? " sm__cat-item--active" : ""}`}
                onClick={() => setSelectedCat(null)}
              >
                <span className="sm__cat-icon">—</span>
                <span className="sm__cat-name">None</span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.category_id}
                  className={`sm__cat-item${selectedCat?.category_id === cat.category_id ? " sm__cat-item--active" : ""}`}
                  onClick={() => setSelectedCat(cat)}
                >
                  <span className="sm__cat-icon">
                    <CategoryIcon
                      iconUrl={cat.icon_url}
                      iconType={cat.icon_type || detectIconType(cat.icon_url)}
                      name={cat.name}
                      size={24}
                    />
                  </span>
                  <span className="sm__cat-name">{cat.name}</span>
                </button>
              ))}
            </div>
          )}

          {fromDynamicQR && defaultCategoryId && (
            <p className="sm__field-hint sm__field-hint--cat">
              Category pre-selected by merchant — you can change it above.
            </p>
          )}

          <div className="sm__field">
            <label className="sm__label">
              Remarks <span className="sm__required">*</span>
            </label>
            <input
              className={`sm__input${remarksErr ? " sm__input--err" : ""}`}
              type="text"
              placeholder="What's this for? (required)"
              maxLength={120}
              value={remarks}
              autoFocus={amountLocked}
              onChange={(e) => {
                setRemarks(e.target.value);
                if (remarksErr) setRemarksErr("");
              }}
            />
            {remarksErr ? <p className="sm__field-err">{remarksErr}</p> : ""}
          </div>

          <button className="sm__btn sm__btn--primary" onClick={handleContinue}>
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
