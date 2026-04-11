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

// ─── MPIN overlay ─────────────────────────────────────────────────────────────

function MpinOverlay({ amount, receiverName, onConfirm, onClose, submitting, error }) {
    const [mpin, setMpin] = useState("");
    const DIGITS = 6;
    const keys   = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

    function handleKey(k) {
        if (submitting) return;
        if (k === "⌫") setMpin(v => v.slice(0, -1));
        else if (mpin.length < DIGITS) setMpin(v => v + k);
    }

    return (
        <div className="sm__overlay-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="sm__overlay">
                <div className="sm__overlay-handle" />

                <div className="sm__overlay-header">
                    <p className="sm__overlay-title">Enter MPIN</p>
                    <p className="sm__overlay-sub">
                        Confirm sending <strong>NPR {Number(amount).toLocaleString()}</strong>
                        {receiverName ? ` to ${receiverName}` : ""}
                    </p>
                </div>

                <div className="sm__mpin-dots">
                    {Array.from({ length: DIGITS }).map((_, i) => (
                        <div key={i} className={`sm__mpin-dot${i < mpin.length ? " sm__mpin-dot--filled" : ""}`} />
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
                    disabled={submitting || mpin.length < 4}
                >
                    {submitting ? "Transferring…" : "Confirm Transfer"}
                </button>
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

    // Views: "phone" | "amount" | "confirm" | "success"
    const [view,       setView]       = useState(qrId ? "amount" : "phone");
    const [phone,      setPhone]      = useState(qrId);
    const [receiver,   setReceiver]   = useState(qrId && qrName ? { display_name: qrName, account_id: qrId } : null);
    const [lookingUp,  setLookingUp]  = useState(false);
    const [lookupErr,  setLookupErr]  = useState("");

    const [amount,     setAmount]     = useState(qrAmount);

    // Category + remarks expand inline after "Proceed"
    const [showExtra,   setShowExtra]   = useState(!!qrAmount); // if QR has amount, show right away
    const [categories,  setCategories]  = useState([]);
    const [catsLoading, setCatsLoading] = useState(false);
    const [selectedCat, setSelectedCat] = useState(null);
    const [remarks,     setRemarks]     = useState(qrNote);

    // MPIN overlay
    const [showMpin,   setShowMpin]   = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitErr,  setSubmitErr]  = useState("");

    // Auto-lookup if QR has id but no name
    useEffect(() => {
        if (qrId && !qrName) doLookup(qrId, true);
    }, []); // eslint-disable-line

    // Load categories when extra panel first opens
    useEffect(() => {
        if (showExtra && categories.length === 0) {
            setCatsLoading(true);
            getTransactionCategories()
                .then(d => setCategories(d?.categories || []))
                .catch(() => setCategories([]))
                .finally(() => setCatsLoading(false));
        }
    }, [showExtra]); // eslint-disable-line

    function normalisePhone(raw) {
        const val = (raw ?? "").trim();
        if (!val || val.startsWith("+")) return val;
        if (val.startsWith("977") && val.length > 10) return "+" + val;
        return "+977" + val;
    }

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

    function handleAmountProceed() {
        if (!parseFloat(amount) || parseFloat(amount) < 1) return;
        setShowExtra(true);
    }

    async function handleTransfer(mpin) {
        if (mpin.length < 4) { setSubmitErr("Enter your MPIN (4–6 digits)."); return; }
        setSubmitting(true);
        setSubmitErr("");
        try {
            await transfer({
                receiver_identifier: normalisePhone(phone) || receiver?.account_id,
                amount: parseFloat(amount),
                ...(selectedCat ? { category_id: selectedCat.category_id } : {}),
                ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
                mpin,
            });
            setShowMpin(false);
            setView("success");
        } catch (e) {
            setSubmitErr(e.message || "Transfer failed.");
        } finally {
            setSubmitting(false);
        }
    }

    function goBack() {
        if (showMpin)             { setShowMpin(false); return; }
        if (view === "confirm")   { setView("amount");  return; }
        if (view === "amount")    { setView("phone");   return; }
        navigate(-1);
    }

    // ── Success ───────────────────────────────────────────────────────────────
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

    // ── Confirm view ──────────────────────────────────────────────────────────
    if (view === "confirm") {
        return (
            <div className="sm">
                <button className="sm__back" onClick={goBack}><BackArrow /> Back</button>
                <h1 className="sm__heading">Review Transfer</h1>

                <div className="sm__confirm-hero">
                    <span className="sm__confirm-hero-currency">NPR</span>
                    <span className="sm__confirm-hero-value">{Number(amount).toLocaleString()}</span>
                </div>

                <div className="sm__confirm-card">
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

                <button className="sm__btn sm__btn--primary sm__btn--send"
                    onClick={() => { setSubmitErr(""); setShowMpin(true); }}>
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

    // ── Phone view ────────────────────────────────────────────────────────────
    if (view === "phone") {
        return (
            <div className="sm">
                <button className="sm__back" onClick={() => navigate(-1)}><BackArrow /> Back</button>
                <h1 className="sm__heading">Send Money</h1>
                <p className="sm__sub">Transfer funds to any Kharcha user</p>

                <div className="sm__field">
                    <label className="sm__label">Mobile Number</label>
                    <div className={`sm__input-row${lookupErr ? " sm__input-row--err" : ""}`}>
                        <UserIcon />
                        <input
                            className="sm__input"
                            type="tel"
                            placeholder="98XXXXXXXX — no need for +977"
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
        );
    }

    // ── Amount view (+ inline category/remarks) ───────────────────────────────
    return (
        <div className="sm">
            <button className="sm__back" onClick={goBack}><BackArrow /> Back</button>
            <h1 className="sm__heading">Send Money</h1>

            {qrId && (
                <div className="sm__qr-banner"><QRIcon /> Details filled from QR scan</div>
            )}

            {/* Receiver chip */}
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

            {/* Amount */}
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
                        autoFocus={!qrAmount}
                        onChange={e => { setAmount(e.target.value); if (showExtra) setShowExtra(false); }}
                    />
                </div>
                <div className="sm__presets">
                    {PRESETS.map(p => (
                        <button
                            key={p}
                            className="sm__preset"
                            onClick={() => { setAmount(String((parseFloat(amount) || 0) + p)); setShowExtra(false); }}
                        >
                            {p.toLocaleString()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Proceed button — only shown before extra panel opens */}
            {!showExtra && (
                <button
                    className="sm__btn sm__btn--primary"
                    onClick={handleAmountProceed}
                    disabled={!parseFloat(amount) || parseFloat(amount) < 1}
                >
                    Proceed
                </button>
            )}

            {/* Category + Remarks — expand inline after Proceed */}
            {showExtra && (
                <div className="sm__extra">
                    <div className="sm__extra-divider">
                        <span>Category & Remarks</span>
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

                    <div className="sm__field">
                        <label className="sm__label">
                            Remarks <span className="sm__optional">(optional)</span>
                        </label>
                        <input
                            className="sm__input"
                            type="text"
                            placeholder="What's this for?"
                            maxLength={120}
                            value={remarks}
                            onChange={e => setRemarks(e.target.value)}
                        />
                    </div>

                    <button
                        className="sm__btn sm__btn--primary"
                        onClick={() => setView("confirm")}
                    >
                        Continue
                    </button>
                </div>
            )}
        </div>
    );
}