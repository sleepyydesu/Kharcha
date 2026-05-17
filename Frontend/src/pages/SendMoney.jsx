import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    transfer,
    lookupReceiver,
    getTransactionCategories,
    biometricVerifyTransactionApi,
} from "../services/api";
import CategoryIcon from "../components/CategoryIcon";
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    );
}

const PRESETS = [100, 500, 1000, 2000, 5000];

// ── Helpers ───────────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
function MpinOverlay({ amount, receiverName, onConfirm, onClose, submitting, error }) {
    const [mpin, setMpin] = useState("");
    const DIGITS = 6;
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

    function handleKey(k) {
        if (submitting) return;
        if (k === "⌫") setMpin((v) => v.slice(0, -1));
        else if (mpin.length < DIGITS) setMpin((v) => v + k);
    }

    return (
        <div className="sm__overlay-backdrop"
            onClick={(e) => e.target === e.currentTarget && onClose()}>
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
                        <div key={i}
                            className={`sm__mpin-dot${i < mpin.length ? " sm__mpin-dot--filled" : ""}`}
                        />
                    ))}
                </div>
                {error && <p className="sm__overlay-err">{error}</p>}
                <div className="sm__mpin-pad">
                    {keys.map((k, i) => (
                        <button key={i} type="button"
                            className={`sm__mpin-key${k === "" ? " sm__mpin-key--empty" : ""}${k === "⌫" ? " sm__mpin-key--del" : ""}`}
                            onClick={() => k && handleKey(k)}
                            disabled={submitting || k === ""}>
                            {k}
                        </button>
                    ))}
                </div>
                <button className="sm__btn sm__btn--primary sm__btn--send"
                    onClick={() => onConfirm(mpin)}
                    disabled={submitting || mpin.length < 4}>
                    {submitting ? "Transferring…" : "Confirm Transfer"}
                </button>
            </div>
        </div>
    );
}

export default function SendMoney() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const qrId              = searchParams.get("id")                    || "";
    const qrName            = searchParams.get("name")                  || "";
    const qrAmount          = searchParams.get("amount")                || "";
    const qrNote            = searchParams.get("note")                  || "";
    const qrCodeId          = searchParams.get("qr_id")                 || "";
    const defaultCategoryId = searchParams.get("default_category_id")   || "";
    const defaultCategoryName = searchParams.get("default_category_name") || "";

    const fromDynamicQR = Boolean(qrCodeId);
    const amountLocked  = fromDynamicQR && Boolean(qrAmount);

    const [view, setView]         = useState(qrId ? "amount" : "phone");
    const [phone, setPhone]       = useState(qrId);
    const [receiver, setReceiver] = useState(
        qrId && qrName ? { display_name: qrName, account_id: qrId } : null,
    );
    const [lookingUp, setLookingUp] = useState(false);
    const [lookupErr, setLookupErr] = useState("");

    const [amount, setAmount]         = useState(qrAmount);
    const [showExtra, setShowExtra]   = useState(!!qrAmount);
    const [categories, setCategories] = useState([]);
    const [catsLoading, setCatsLoading] = useState(false);
    const [selectedCat, setSelectedCat] = useState(
        defaultCategoryId && defaultCategoryName
            ? { category_id: Number(defaultCategoryId), name: defaultCategoryName }
            : null,
    );
    const [remarks, setRemarks]       = useState(qrNote);
    const [remarksErr, setRemarksErr] = useState("");

    const [showMpin, setShowMpin]     = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitErr, setSubmitErr]   = useState("");

    // Biometric payment state — checked once on mount
    const [biometricTxReady, setBiometricTxReady]       = useState(false);
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

    function handleAmountProceed() {
        if (!parseFloat(amount) || parseFloat(amount) < 1) return;
        setShowExtra(true);
    }

    function handleContinue() {
        if (!remarks.trim()) {
            setRemarksErr("Remarks are required — describe the purpose of this payment.");
            return;
        }
        setRemarksErr("");
        setView("confirm");
    }

    async function handleTransfer(mpin) {
        if (mpin.length < 4) {
            setSubmitErr("Enter your MPIN (4–6 digits).");
            return;
        }
        setSubmitting(true);
        setSubmitErr("");
        try {
            const receiver_identifier = normalisePhone(phone) || receiver?.account_id;
            await transfer({
                receiver_identifier,
                amount: parseFloat(amount),
                ...(selectedCat ? { category_id: selectedCat.category_id } : {}),
                remarks: remarks.trim(),
                ...(qrCodeId ? { qr_id: qrCodeId } : {}),
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

    async function handleBiometricTransfer() {
        setBiometricSubmitting(true);
        setSubmitErr("");
        try {
            const { biometric_token } = await biometricTxLogin(biometricVerifyTransactionApi);
            const receiver_identifier = normalisePhone(phone) || receiver?.account_id;
            await transfer({
                receiver_identifier,
                amount: parseFloat(amount),
                ...(selectedCat ? { category_id: selectedCat.category_id } : {}),
                remarks: remarks.trim(),
                ...(qrCodeId ? { qr_id: qrCodeId } : {}),
                biometric_token,
            });
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
                setSubmitErr(e.message || "Biometric transfer failed. Try entering MPIN instead.");
            }
        } finally {
            setBiometricSubmitting(false);
        }
    }

    function goBack() {
        if (showMpin) { setShowMpin(false); return; }
        if (view === "confirm") { setView("amount"); return; }
        if (view === "amount") { setView("phone"); return; }
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
                    <button className="sm__btn sm__btn--primary"
                        onClick={() => navigate("/statements")}>
                        View Statement
                    </button>
                    <button className="sm__btn sm__btn--ghost"
                        onClick={() => navigate("/")}>
                        Back to Home
                    </button>
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
                                    {" "}· {receiver?.phone_number || phone}
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
                            <span className="sm__confirm-val"
                                style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                <StoreIcon /> Merchant QR
                            </span>
                        </div>
                    )}
                </div>

                {submitErr && (
                    <p className="sm__submit-err">{submitErr}</p>
                )}

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
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="1.8"
                                strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
                                <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
                                <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
                                <path d="M2 12a10 10 0 0 1 18-6" />
                                <path d="M2 17c1 .5 2.06.78 3 .87" />
                                <path d="M22 6c.18.5.33 1 .44 1.5" />
                                <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
                                <path d="M17.44 9a6 6 0 0 1 .56 3 22.49 22.49 0 0 1-.31 3" />
                                <path d="M4.42 11.247A13.152 13.152 0 0 0 4 12a13.55 13.55 0 0 0 2.1 7.338" />
                                <path d="M8.53 16.11a6 6 0 0 0 .98 3.89" />
                                <path d="M12 20c-.3.8-.7 1.4-1 2" />
                            </svg>
                        )}
                        <span>{biometricSubmitting ? "Verifying…" : "Pay with Fingerprint"}</span>
                    </button>
                )}

                {biometricTxReady && (
                    <div className="sm__or-divider"><span>or</span></div>
                )}

                <button
                    className="sm__btn sm__btn--primary sm__btn--send"
                    onClick={() => { setSubmitErr(""); setShowMpin(true); }}
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
        return (
            <div className="sm">
                <button className="sm__back" onClick={() => navigate(-1)}>
                    <BackArrow /> Back
                </button>
                <h1 className="sm__heading">Send Money</h1>
                <p className="sm__sub">Transfer funds to any Kharcha user</p>
                <div className="sm__field">
                    <label className="sm__label">Mobile Number</label>
                    <div className={`sm__input-row${lookupErr ? " sm__input-row--err" : ""}`}>
                        <UserIcon />
                        <input
                            className="sm__input"
                            type="tel"
                            inputMode="numeric"
                            placeholder="98XXXXXXXX"
                            value={phone}
                            autoFocus
                            onChange={(e) => { setPhone(e.target.value); setLookupErr(""); }}
                            onKeyDown={(e) => {
                                // Allow control keys and + prefix for country codes
                                const ctrl = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End"];
                                if (ctrl.includes(e.key)) return;
                                if (e.key === "+" && e.target.selectionStart === 0) return;
                                // Block anything that isn't a digit
                                if (!/^\d$/.test(e.key)) e.preventDefault();
                                // Also trigger lookup on Enter
                                if (e.key === "Enter" && !lookingUp && phone.trim()) doLookup();
                            }}
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
                    <QRIcon /> Details filled from QR scan
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
                    <p className="sm__field-hint">Amount fixed by merchant.</p>
                ) : (
                    <div className="sm__presets">
                        {PRESETS.map((p) => (
                            <button key={p} className="sm__preset"
                                onClick={() => {
                                    setAmount(String((parseFloat(amount) || 0) + p));
                                    setShowExtra(false);
                                }}>
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
                                onClick={() => setSelectedCat(null)}>
                                <span className="sm__cat-icon">—</span>
                                <span className="sm__cat-name">None</span>
                            </button>
                            {categories.map((cat) => (
                                <button key={cat.category_id}
                                    className={`sm__cat-item${selectedCat?.category_id === cat.category_id ? " sm__cat-item--active" : ""}`}
                                    onClick={() => setSelectedCat(cat)}>
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