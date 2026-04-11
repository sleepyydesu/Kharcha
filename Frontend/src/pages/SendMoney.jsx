import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { transfer, lookupReceiver, getTransactionCategories } from "../services/api";
import "./SendMoney.css";

// ─── Icons ────────────────────────────────────────────────────────────────────

function BackArrow() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
        </svg>
    );
}

function UserIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function QRIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="3" height="3" />
            <rect x="17" y="17" width="3" height="3" />
        </svg>
    );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESETS = [100, 500, 1000, 2000, 5000];
const STEP_ORDER = ["phone", "amount", "category", "confirm", "mpin"];
const STEP_LABELS = ["Phone", "Amount", "Category", "Confirm", "MPIN"];

// ─── Step Bar ─────────────────────────────────────────────────────────────────

function StepBar({ current }) {
    return (
        <div className="sm__stepbar">
            {STEP_LABELS.map((label, i) => (
                <div key={label} className="sm__step-wrap">
                    <div className={`sm__step-dot ${i < current ? "sm__step-dot--done" : i === current ? "sm__step-dot--active" : ""}`}>
                        {i < current ? <CheckIcon /> : <span>{i + 1}</span>}
                    </div>
                    <span className={`sm__step-label ${i === current ? "sm__step-label--active" : ""}`}>{label}</span>
                    {i < STEP_LABELS.length - 1 && (
                        <div className={`sm__step-line ${i < current ? "sm__step-line--done" : ""}`} />
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── MPIN Pad ─────────────────────────────────────────────────────────────────

function MpinPad({ value, onChange, disabled }) {
    const DIGITS = 6;
    const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

    function handleKey(k) {
        if (disabled) return;
        if (k === "⌫") onChange(value.slice(0, -1));
        else if (value.length < DIGITS) onChange(value + k);
    }

    return (
        <div className="sm__mpin-wrap">
            <div className="sm__mpin-dots">
                {Array.from({ length: DIGITS }).map((_, i) => (
                    <div key={i} className={`sm__mpin-dot ${i < value.length ? "sm__mpin-dot--filled" : ""}`} />
                ))}
            </div>
            <div className="sm__mpin-pad">
                {keys.map((k, i) => (
                    <button
                        key={i}
                        type="button"
                        className={`sm__mpin-key${k === "" ? " sm__mpin-key--empty" : ""}${k === "⌫" ? " sm__mpin-key--del" : ""}`}
                        onClick={() => k && handleKey(k)}
                        disabled={disabled || k === ""}
                    >
                        {k}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SendMoney() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const qrId     = searchParams.get("id")     || "";
    const qrName   = searchParams.get("name")   || "";
    const qrAmount = searchParams.get("amount") || "";
    const qrNote   = searchParams.get("note")   || "";

    const [step,     setStep]     = useState(qrId ? "amount" : "phone");
    const [phone,    setPhone]    = useState(qrId);
    const [receiver, setReceiver] = useState(qrId && qrName ? { display_name: qrName, account_id: qrId } : null);
    const [lookingUp,setLookingUp]= useState(false);
    const [lookupErr,setLookupErr]= useState("");

    const [amount,   setAmount]   = useState(qrAmount);

    const [categories,  setCategories]  = useState([]);
    const [catsLoading, setCatsLoading] = useState(false);
    const [selectedCat, setSelectedCat] = useState(null);
    const [remarks,     setRemarks]     = useState(qrNote);

    const [mpin,       setMpin]       = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitErr,  setSubmitErr]  = useState("");
    const [txData,     setTxData]     = useState(null);

    // Auto-lookup if QR has id but no name
    useEffect(() => {
        if (qrId && !qrName) doLookup(qrId, true);
    }, []); // eslint-disable-line

    // Fetch categories when step changes to category
    useEffect(() => {
        if (step === "category" && categories.length === 0) {
            setCatsLoading(true);
            getTransactionCategories()
                .then(d => setCategories(d?.categories || []))
                .catch(() => setCategories([]))
                .finally(() => setCatsLoading(false));
        }
    }, [step]); // eslint-disable-line

    async function doLookup(id, silent = false) {
        const val = (id ?? phone).trim();
        if (!val) return;
        setLookingUp(true);
        setLookupErr("");
        try {
            const d = await lookupReceiver(val);
            setReceiver(d?.receiver || d);
            if (!silent) setStep("amount");
        } catch (e) {
            setLookupErr(e.message || "User not found.");
            setReceiver(null);
        } finally {
            setLookingUp(false);
        }
    }

    function goBack() {
        const i = STEP_ORDER.indexOf(step);
        if (i > 0) setStep(STEP_ORDER[i - 1]);
        else navigate(-1);
    }

    async function handleTransfer() {
        if (mpin.length < 4) { setSubmitErr("Enter your MPIN (4–6 digits)."); return; }
        setSubmitting(true);
        setSubmitErr("");
        try {
            const d = await transfer({
                receiver_identifier: phone.trim() || receiver?.account_id,
                amount: parseFloat(amount),
                ...(selectedCat ? { category_id: selectedCat.category_id } : {}),
                ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
                mpin,
            });
            setTxData(d);
            setStep("success");
        } catch (e) {
            setSubmitErr(e.message || "Transfer failed.");
        } finally {
            setSubmitting(false);
        }
    }

    const stepIndex = STEP_ORDER.indexOf(step);

    // ── Success ───────────────────────────────────────────────────────────────
    if (step === "success") {
        return (
            <div className="sm">
                <div className="sm__success">
                    <div className="sm__success-ring">✓</div>
                    <h2 className="sm__success-title">Sent!</h2>
                    <p className="sm__success-line">
                        NPR <strong>{Number(amount).toLocaleString()}</strong> sent
                        {receiver?.display_name ? ` to ${receiver.display_name}` : ""}
                    </p>
                    {remarks.trim() && <p className="sm__success-remark">"{remarks.trim()}"</p>}
                    <button className="sm__btn sm__btn--primary" onClick={() => navigate("/statements")}>
                        View Statement
                    </button>
                    <button className="sm__btn sm__btn--ghost" onClick={() => navigate("/")}>
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="sm">
            <button className="sm__back" onClick={goBack}>
                <BackArrow /> Back
            </button>

            <h1 className="sm__heading">Send Money</h1>
            <StepBar current={stepIndex} />

            {qrId && step !== "phone" && (
                <div className="sm__qr-banner">
                    <QRIcon /> Details filled from QR scan
                </div>
            )}

            {/* ── PHONE ─────────────────────────────────────────────────── */}
            {step === "phone" && (
                <div className="sm__pane">
                    <p className="sm__pane-title">Who are you sending to?</p>
                    <div className="sm__field">
                        <label className="sm__label">Mobile Number</label>
                        <div className={`sm__input-row${lookupErr ? " sm__input-row--err" : ""}`}>
                            <UserIcon />
                            <input
                                className="sm__input"
                                type="tel"
                                placeholder="98XXXXXXXX"
                                value={phone}
                                autoFocus
                                onChange={e => { setPhone(e.target.value); setLookupErr(""); }}
                                onKeyDown={e => e.key === "Enter" && !lookingUp && phone.trim() && doLookup()}
                            />
                        </div>
                        {lookupErr && <p className="sm__field-err">{lookupErr}</p>}
                    </div>
                    <button
                        className="sm__btn sm__btn--primary"
                        onClick={() => doLookup()}
                        disabled={lookingUp || !phone.trim()}
                    >
                        {lookingUp ? "Looking up…" : "Proceed"}
                    </button>
                </div>
            )}

            {/* ── AMOUNT ────────────────────────────────────────────────── */}
            {step === "amount" && (
                <div className="sm__pane">
                    {receiver && (
                        <div className="sm__receiver-chip">
                            <div className="sm__receiver-avatar">
                                {receiver.profile_picture
                                    ? <img src={receiver.profile_picture} alt="" />
                                    : <UserIcon />}
                            </div>
                            <div className="sm__receiver-info">
                                <div className="sm__receiver-name">{receiver.display_name || "Unknown"}</div>
                                <div className="sm__receiver-phone">{receiver.phone_number || phone}</div>
                            </div>
                            <div className="sm__receiver-verified"><CheckIcon /></div>
                        </div>
                    )}
                    <div className="sm__field">
                        <label className="sm__label">Amount (NPR)</label>
                        <div className="sm__amount-row">
                            <span className="sm__prefix">रू</span>
                            <input
                                className="sm__input sm__input--amount"
                                type="number"
                                min="1"
                                placeholder="0.00"
                                value={amount}
                                autoFocus
                                onChange={e => setAmount(e.target.value)}
                            />
                        </div>
                        <div className="sm__presets">
                            {PRESETS.map(p => (
                                <button
                                    key={p}
                                    className={`sm__preset${String(amount) === String(p) ? " sm__preset--active" : ""}`}
                                    onClick={() => setAmount(String(p))}
                                >
                                    {p.toLocaleString()}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        className="sm__btn sm__btn--primary"
                        onClick={() => setStep("category")}
                        disabled={!parseFloat(amount) || parseFloat(amount) < 1}
                    >
                        Proceed
                    </button>
                </div>
            )}

            {/* ── CATEGORY ──────────────────────────────────────────────── */}
            {step === "category" && (
                <div className="sm__pane">
                    <p className="sm__pane-title">Categorise this transfer</p>
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
                            {categories.map(cat => (
                                <button
                                    key={cat.category_id}
                                    className={`sm__cat-item${selectedCat?.category_id === cat.category_id ? " sm__cat-item--active" : ""}`}
                                    onClick={() => setSelectedCat(cat)}
                                >
                                    <span className="sm__cat-icon">
                                        {cat.icon
                                            ? <img src={cat.icon} alt={cat.name} className="sm__cat-img" />
                                            : "💳"}
                                    </span>
                                    <span className="sm__cat-name">{cat.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="sm__field" style={{ marginTop: "1.2rem" }}>
                        <label className="sm__label">Remarks <span className="sm__optional">(optional)</span></label>
                        <input
                            className="sm__input"
                            type="text"
                            placeholder="What's this for?"
                            maxLength={120}
                            value={remarks}
                            onChange={e => setRemarks(e.target.value)}
                        />
                    </div>
                    <button className="sm__btn sm__btn--primary" onClick={() => setStep("confirm")}>
                        Continue
                    </button>
                </div>
            )}

            {/* ── CONFIRM ───────────────────────────────────────────────── */}
            {step === "confirm" && (
                <div className="sm__pane">
                    <p className="sm__pane-title">Review your transfer</p>
                    <div className="sm__confirm-card">
                        <div className="sm__confirm-amount">
                            <span className="sm__confirm-currency">NPR</span>
                            <span className="sm__confirm-value">{Number(amount).toLocaleString()}</span>
                        </div>
                        <div className="sm__confirm-divider" />
                        <div className="sm__confirm-row">
                            <span className="sm__confirm-key">To</span>
                            <span className="sm__confirm-val">
                                {receiver?.display_name || "—"}
                                {(receiver?.phone_number || phone) && (
                                    <small className="sm__confirm-phone"> · {receiver?.phone_number || phone}</small>
                                )}
                            </span>
                        </div>
                        {selectedCat && (
                            <div className="sm__confirm-row">
                                <span className="sm__confirm-key">Category</span>
                                <span className="sm__confirm-val">{selectedCat.name}</span>
                            </div>
                        )}
                        {remarks.trim() && (
                            <div className="sm__confirm-row">
                                <span className="sm__confirm-key">Remarks</span>
                                <span className="sm__confirm-val sm__confirm-val--remark">"{remarks.trim()}"</span>
                            </div>
                        )}
                        <div className="sm__confirm-row">
                            <span className="sm__confirm-key">Method</span>
                            <span className="sm__confirm-val">Kharcha Wallet</span>
                        </div>
                    </div>
                    <button className="sm__btn sm__btn--primary" onClick={() => setStep("mpin")}>
                        Confirm
                    </button>
                </div>
            )}

            {/* ── MPIN ──────────────────────────────────────────────────── */}
            {step === "mpin" && (
                <div className="sm__pane sm__pane--mpin">
                    <p className="sm__pane-title">Enter your MPIN</p>
                    <p className="sm__pane-sub">
                        Authorise sending NPR <strong>{Number(amount).toLocaleString()}</strong>
                        {receiver?.display_name ? ` to ${receiver.display_name}` : ""}
                    </p>
                    <MpinPad value={mpin} onChange={setMpin} disabled={submitting} />
                    {submitErr && <p className="sm__error">{submitErr}</p>}
                    <button
                        className="sm__btn sm__btn--primary sm__btn--send"
                        onClick={handleTransfer}
                        disabled={submitting || mpin.length < 4}
                    >
                        {submitting ? "Transferring…" : "Confirm Transfer"}
                    </button>
                </div>
            )}
        </div>
    );
}