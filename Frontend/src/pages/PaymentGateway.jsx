import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
    resolveQRCode,
    transfer,
    getTransactionCategories,
} from "../services/api";
import "./PaymentGateway.css";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ─── Helpers ──────────────────────────────────────────────────
function getToken() {
    return localStorage.getItem("token");
}
function setToken(t) {
    localStorage.setItem("token", t);
}

async function apiLogin(identifier, credential) {
    const res = await fetch(`${BASE}/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, credential }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");
    return data; // { token, account_type, ... }
}

function redirect(return_url, params) {
    if (!return_url) return;
    const url = new URL(return_url);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    window.location.href = url.toString();
}

// ─── Icons ────────────────────────────────────────────────────
function KharchaLogo() {
    return (
        <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="10" fill="#6366f1" />
            <text
                x="18"
                y="25"
                textAnchor="middle"
                fill="white"
                fontSize="18"
                fontWeight="800"
                fontFamily="system-ui"
            >
                K
            </text>
        </svg>
    );
}
function LockIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
        >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
}
function CheckCircleIcon() {
    return (
        <svg
            width="52"
            height="52"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
        >
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12l3 3 5-6" />
        </svg>
    );
}
function XCircleIcon() {
    return (
        <svg
            width="52"
            height="52"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
    );
}
function StoreIcon() {
    return (
        <svg
            width="16"
            height="16"
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

// ─── MPIN pad ─────────────────────────────────────────────────
function MpinPad({ value, onChange, disabled }) {
    const DIGITS = 6;
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
    function tap(k) {
        if (disabled) return;
        if (k === "⌫") onChange(value.slice(0, -1));
        else if (value.length < DIGITS) onChange(value + k);
    }
    return (
        <div className="pgw__mpin">
            <div className="pgw__mpin-dots">
                {Array.from({ length: DIGITS }).map((_, i) => (
                    <div
                        key={i}
                        className={`pgw__mpin-dot${i < value.length ? " pgw__mpin-dot--on" : ""}`}
                    />
                ))}
            </div>
            <div className="pgw__mpin-pad">
                {keys.map((k, i) => (
                    <button
                        key={i}
                        type="button"
                        className={`pgw__mpin-key${!k ? " pgw__mpin-key--empty" : ""}${k === "⌫" ? " pgw__mpin-key--del" : ""}`}
                        onClick={() => k && tap(k)}
                        disabled={disabled || !k}
                    >
                        {k}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─── Step tracker ─────────────────────────────────────────────
function Steps({ current }) {
    const steps = ["Login", "Review", "Pay"];
    return (
        <div className="pgw__steps">
            {steps.map((label, i) => {
                const idx = i + 1;
                const done = idx < current;
                const active = idx === current;
                return (
                    <div key={label} className="pgw__step-item">
                        <div
                            className={`pgw__step-dot${done ? " pgw__step-dot--done" : ""}${active ? " pgw__step-dot--active" : ""}`}
                        >
                            {done ? "✓" : idx}
                        </div>
                        <span
                            className={`pgw__step-label${active ? " pgw__step-label--active" : ""}`}
                        >
                            {label}
                        </span>
                        {i < steps.length - 1 && (
                            <div
                                className={`pgw__step-line${done ? " pgw__step-line--done" : ""}`}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Merchant header card ──────────────────────────────────────
function MerchantCard({ merchant, amount, note }) {
    return (
        <div className="pgw__merchant-card">
            <div className="pgw__merchant-avatar">
                <StoreIcon />
            </div>
            <div className="pgw__merchant-info">
                <p className="pgw__merchant-name">
                    {merchant?.name || "Merchant"}
                </p>
                {note && <p className="pgw__merchant-note">{note}</p>}
            </div>
            <div className="pgw__merchant-amount">
                <span className="pgw__amount-currency">NPR</span>
                <span className="pgw__amount-value">
                    {Number(amount).toLocaleString("en-NP", {
                        minimumFractionDigits: 2,
                    })}
                </span>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────
export default function PaymentGateway() {
    const { session_id } = useParams();
    const [searchParams] = useSearchParams();
    const return_url = searchParams.get("return_url") || "";

    // ── Session ───────────────────────────────────────────────
    const [session, setSession] = useState(null); // resolved QR info
    const [loading, setLoading] = useState(true);
    const [sessionErr, setSessionErr] = useState("");

    // ── Auth ──────────────────────────────────────────────────
    const [authed, setAuthed] = useState(Boolean(getToken()));
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [loginErr, setLoginErr] = useState("");
    const [loggingIn, setLoggingIn] = useState(false);

    // ── Payment form ──────────────────────────────────────────
    const [step, setStep] = useState(authed ? 2 : 1); // 1=login 2=review 3=pay
    const [categories, setCategories] = useState([]);
    const [selectedCat, setSelectedCat] = useState(null);
    const [remarks, setRemarks] = useState("");
    const [remarksErr, setRemarksErr] = useState("");
    const [mpin, setMpin] = useState("");
    const [paying, setPaying] = useState(false);
    const [payErr, setPayErr] = useState("");

    // ── Result ────────────────────────────────────────────────
    const [result, setResult] = useState(null); // { status: "success"|"failed", txn_id? }

    // Fetch session on mount
    useEffect(() => {
        resolveQRCode(session_id)
            .then((d) => setSession(d.qr))
            .catch((e) =>
                setSessionErr(
                    e.message || "Payment session not found or expired.",
                ),
            )
            .finally(() => setLoading(false));
    }, [session_id]);

    // Load categories when entering review step
    useEffect(() => {
        if (step === 2 && authed) {
            getTransactionCategories()
                .then((d) => {
                    const cats = d?.categories || [];
                    setCategories(cats);
                    // Pre-select the default category if the session has one
                    if (session?.default_category) {
                        setSelectedCat(session.default_category);
                    }
                })
                .catch(() => {});
        }
    }, [step, authed]); // eslint-disable-line

    // ── Login ─────────────────────────────────────────────────
    async function handleLogin(e) {
        e.preventDefault();
        if (!identifier.trim() || !password.trim()) return;
        setLoggingIn(true);
        setLoginErr("");
        try {
            const data = await apiLogin(identifier.trim(), password.trim());
            setToken(data.token || data.access_token);
            setAuthed(true);
            setStep(2);
        } catch (err) {
            setLoginErr(err.message || "Login failed.");
        } finally {
            setLoggingIn(false);
        }
    }

    // ── Review → Pay ──────────────────────────────────────────
    function handleReview(e) {
        e.preventDefault();
        if (!remarks.trim()) {
            setRemarksErr("Please enter a remark for this payment.");
            return;
        }
        setRemarksErr("");
        setStep(3);
    }

    // ── Pay ───────────────────────────────────────────────────
    async function handlePay() {
        if (mpin.length < 4) return;
        setPaying(true);
        setPayErr("");
        try {
            const res = await transfer({
                receiver_identifier: session.merchant.account_id,
                amount: Number(session.amount),
                ...(selectedCat
                    ? { category_id: selectedCat.category_id }
                    : {}),
                remarks: remarks.trim(),
                qr_id: session_id,
                mpin,
            });
            const txn_id = res.transaction?.transaction_id || "";
            setResult({ status: "success", txn_id });
            // Auto-redirect after 2 s
            setTimeout(() => {
                redirect(return_url, {
                    status: "success",
                    transaction_id: txn_id,
                    session_id,
                    amount: session.amount,
                });
            }, 2000);
        } catch (err) {
            setPayErr(err.message || "Payment failed.");
            // If wrong MPIN, let user retry — don't lock them out
        } finally {
            setPaying(false);
        }
    }

    // ── Cancel ────────────────────────────────────────────────
    function handleCancel() {
        redirect(return_url, { status: "cancelled", session_id });
    }

    // ─────────────────────────────────────────────────────────
    //  RENDER
    // ─────────────────────────────────────────────────────────

    return (
        <div className="pgw__root">
            {/* ── Branded header ── */}
            <header className="pgw__header">
                <div className="pgw__logo-row">
                    <KharchaLogo />
                    <span className="pgw__logo-name">Kharcha</span>
                </div>
                <div className="pgw__secure-badge">
                    <LockIcon /> Secure Checkout
                </div>
            </header>

            <main className="pgw__main">
                {/* ── Loading ── */}
                {loading && (
                    <div className="pgw__loading">
                        <div className="pgw__spinner" />
                        <p>Loading payment details…</p>
                    </div>
                )}

                {/* ── Session error ── */}
                {!loading && sessionErr && (
                    <div className="pgw__error-screen">
                        <div className="pgw__error-icon">
                            <XCircleIcon />
                        </div>
                        <h2 className="pgw__error-title">
                            Payment Link Invalid
                        </h2>
                        <p className="pgw__error-msg">{sessionErr}</p>
                        {return_url && (
                            <button
                                className="pgw__btn pgw__btn--ghost"
                                onClick={handleCancel}
                            >
                                Return to Merchant
                            </button>
                        )}
                    </div>
                )}

                {/* ── Result screen ── */}
                {result && (
                    <div
                        className={`pgw__result pgw__result--${result.status}`}
                    >
                        <div className="pgw__result-icon">
                            {result.status === "success" ? (
                                <CheckCircleIcon />
                            ) : (
                                <XCircleIcon />
                            )}
                        </div>
                        <h2 className="pgw__result-title">
                            {result.status === "success"
                                ? "Payment Successful!"
                                : "Payment Failed"}
                        </h2>
                        {result.status === "success" && (
                            <p className="pgw__result-amount">
                                NPR{" "}
                                {Number(session.amount).toLocaleString(
                                    "en-NP",
                                    { minimumFractionDigits: 2 },
                                )}
                            </p>
                        )}
                        <p className="pgw__result-redirect">
                            {return_url
                                ? "Redirecting you back…"
                                : "You may close this page."}
                        </p>
                    </div>
                )}

                {/* ── Main flow ── */}
                {!loading && !sessionErr && !result && session && (
                    <div className="pgw__card">
                        {/* Merchant + amount */}
                        <MerchantCard
                            merchant={session.merchant}
                            amount={session.amount}
                            note={session.note}
                        />

                        <Steps current={step} />

                        {/* ── Step 1: Login ── */}
                        {step === 1 && (
                            <form className="pgw__form" onSubmit={handleLogin}>
                                <p className="pgw__form-title">Log in to pay</p>
                                <div className="pgw__field">
                                    <label className="pgw__label">
                                        Phone or Email
                                    </label>
                                    <input
                                        className="pgw__input"
                                        type="text"
                                        placeholder="98XXXXXXXX or you@email.com"
                                        value={identifier}
                                        onChange={(e) => {
                                            setIdentifier(e.target.value);
                                            setLoginErr("");
                                        }}
                                        autoFocus
                                        required
                                    />
                                </div>
                                <div className="pgw__field">
                                    <label className="pgw__label">
                                        Password
                                    </label>
                                    <input
                                        className="pgw__input"
                                        type="password"
                                        placeholder="Your Kharcha password"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            setLoginErr("");
                                        }}
                                        required
                                    />
                                </div>
                                {loginErr && (
                                    <p className="pgw__field-err">{loginErr}</p>
                                )}
                                <button
                                    className="pgw__btn pgw__btn--primary"
                                    type="submit"
                                    disabled={
                                        loggingIn || !identifier || !password
                                    }
                                >
                                    {loggingIn
                                        ? "Logging in…"
                                        : "Log In & Continue"}
                                </button>
                                {return_url && (
                                    <button
                                        type="button"
                                        className="pgw__btn pgw__btn--ghost"
                                        onClick={handleCancel}
                                    >
                                        Cancel
                                    </button>
                                )}
                            </form>
                        )}

                        {/* ── Step 2: Review ── */}
                        {step === 2 && (
                            <form className="pgw__form" onSubmit={handleReview}>
                                <p className="pgw__form-title">
                                    Review & confirm details
                                </p>

                                {categories.length > 0 && (
                                    <div className="pgw__field">
                                        <label className="pgw__label">
                                            Category{" "}
                                            <span className="pgw__optional">
                                                (optional)
                                            </span>
                                        </label>
                                        <div className="pgw__cats">
                                            <button
                                                type="button"
                                                className={`pgw__cat${!selectedCat ? " pgw__cat--active" : ""}`}
                                                onClick={() =>
                                                    setSelectedCat(null)
                                                }
                                            >
                                                None
                                            </button>
                                            {categories.map((cat) => (
                                                <button
                                                    key={cat.category_id}
                                                    type="button"
                                                    className={`pgw__cat${selectedCat?.category_id === cat.category_id ? " pgw__cat--active" : ""}`}
                                                    onClick={() =>
                                                        setSelectedCat(cat)
                                                    }
                                                >
                                                    {cat.icon ? (
                                                        <img
                                                            src={cat.icon}
                                                            alt=""
                                                            className="pgw__cat-icon"
                                                        />
                                                    ) : null}
                                                    {cat.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="pgw__field">
                                    <label className="pgw__label">
                                        Remarks{" "}
                                        <span className="pgw__req">*</span>
                                    </label>
                                    <input
                                        className={`pgw__input${remarksErr ? " pgw__input--err" : ""}`}
                                        type="text"
                                        placeholder="What is this payment for?"
                                        maxLength={120}
                                        value={remarks}
                                        onChange={(e) => {
                                            setRemarks(e.target.value);
                                            setRemarksErr("");
                                        }}
                                        autoFocus
                                    />
                                    {remarksErr && (
                                        <p className="pgw__field-err">
                                            {remarksErr}
                                        </p>
                                    )}
                                </div>

                                <button
                                    className="pgw__btn pgw__btn--primary"
                                    type="submit"
                                >
                                    Continue
                                </button>
                                <button
                                    type="button"
                                    className="pgw__btn pgw__btn--ghost"
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </button>
                            </form>
                        )}

                        {/* ── Step 3: MPIN ── */}
                        {step === 3 && (
                            <div className="pgw__form">
                                <p className="pgw__form-title">
                                    Enter your MPIN to pay
                                </p>

                                <div className="pgw__confirm-summary">
                                    <div className="pgw__confirm-row">
                                        <span className="pgw__confirm-key">
                                            To
                                        </span>
                                        <span className="pgw__confirm-val">
                                            {session.merchant.name}
                                        </span>
                                    </div>
                                    <div className="pgw__confirm-row">
                                        <span className="pgw__confirm-key">
                                            Amount
                                        </span>
                                        <span className="pgw__confirm-val pgw__confirm-val--amount">
                                            NPR{" "}
                                            {Number(
                                                session.amount,
                                            ).toLocaleString("en-NP", {
                                                minimumFractionDigits: 2,
                                            })}
                                        </span>
                                    </div>
                                    {selectedCat && (
                                        <div className="pgw__confirm-row">
                                            <span className="pgw__confirm-key">
                                                Category
                                            </span>
                                            <span className="pgw__confirm-val">
                                                {selectedCat.name}
                                            </span>
                                        </div>
                                    )}
                                    <div className="pgw__confirm-row">
                                        <span className="pgw__confirm-key">
                                            Remarks
                                        </span>
                                        <span className="pgw__confirm-val">
                                            "{remarks}"
                                        </span>
                                    </div>
                                </div>

                                <MpinPad
                                    value={mpin}
                                    onChange={setMpin}
                                    disabled={paying}
                                />

                                {payErr && (
                                    <p className="pgw__field-err pgw__field-err--center">
                                        {payErr}
                                    </p>
                                )}

                                <button
                                    className="pgw__btn pgw__btn--primary pgw__btn--pay"
                                    onClick={handlePay}
                                    disabled={paying || mpin.length < 4}
                                >
                                    {paying
                                        ? "Processing…"
                                        : `Pay NPR ${Number(session.amount).toLocaleString()}`}
                                </button>
                                <button
                                    className="pgw__btn pgw__btn--ghost"
                                    onClick={() => {
                                        setStep(2);
                                        setMpin("");
                                        setPayErr("");
                                    }}
                                >
                                    Back
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <footer className="pgw__footer">
                <p>
                    Secured by <strong>Kharcha</strong> · Payments encrypted
                    end-to-end
                </p>
            </footer>
        </div>
    );
}
