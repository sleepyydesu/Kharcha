import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
    getPortalSession,
    portalLogin,
    portalVerifyAndPay,
    portalResendOTP,
} from "../services/payPortalApi";
import KharchaLogo from "../assets/KharchaLogo.png";
import "./PaymentGateway.css";

// ── Helpers ────────────────────────────────────────────────────
function formatNPR(amount) {
    return Number(amount).toLocaleString("en-NP", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

// ── Brand Components ───────────────────────────────────────────
function KharchaWordmark() {
    return (
        <div className="kpw-wordmark">
            <img src={KharchaLogo} alt="Kharcha" className="kpw-wordmark-logo" />
            <span>Kharcha</span>
        </div>
    );
}

function KharchaPoweredLogo() {
    return (
        <div className="kpw-left-footer">
            <span className="kpw-powered-label">Payment powered by</span>
            <div className="kpw-powered-brand">
                <img src={KharchaLogo} alt="Kharcha" className="kpw-powered-logo" />
                <span>Kharcha</span>
            </div>
        </div>
    );
}

// ── Icons ──────────────────────────────────────────────────────
const IconClock = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
);
const IconCheck = () => (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-5.5" />
    </svg>
);
const IconXCircle = () => (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
);
const IconBack = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
);
const IconMail = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" />
    </svg>
);
const IconEye = ({ off }) => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {off ? (
            <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>
        ) : (
            <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
        )}
    </svg>
);
function Spinner({ size = 18, color = "currentColor" }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
            style={{ animation: "kpw-spin 0.7s linear infinite", flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" opacity="0.25" />
            <path d="M22 12a10 10 0 0 0-10-10" />
        </svg>
    );
}

// ── OTP Input ──────────────────────────────────────────────────
function OTPInput({ length = 6, value, onChange, disabled }) {
    const refs = useRef([]);
    function handleKey(i, e) {
        if (disabled) return;
        const digits = value.split("");
        if (e.key === "Backspace") {
            if (digits[i]) { digits[i] = ""; onChange(digits.join("")); }
            else if (i > 0) { digits[i - 1] = ""; onChange(digits.join("")); refs.current[i - 1]?.focus(); }
            return;
        }
        if (e.key === "ArrowLeft" && i > 0) { refs.current[i - 1]?.focus(); return; }
        if (e.key === "ArrowRight" && i < length - 1) { refs.current[i + 1]?.focus(); return; }
        if (!/^\d$/.test(e.key)) return;
        digits[i] = e.key;
        onChange(digits.join(""));
        if (i < length - 1) refs.current[i + 1]?.focus();
    }
    function handlePaste(e) {
        if (disabled) return;
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
        onChange(pasted.padEnd(length, "").slice(0, length));
        refs.current[Math.min(pasted.length, length - 1)]?.focus();
    }
    return (
        <div className="kpw-otp-row">
            {Array.from({ length }).map((_, i) => (
                <input key={i} ref={el => (refs.current[i] = el)}
                    className={`kpw-otp-cell${value[i] ? " kpw-otp-cell--filled" : ""}`}
                    type="text" inputMode="numeric" maxLength={1}
                    value={value[i] || ""} readOnly disabled={disabled}
                    onKeyDown={e => handleKey(i, e)} onPaste={handlePaste}
                    onFocus={e => e.target.select()} onClick={() => refs.current[i]?.focus()}
                    autoComplete="one-time-code" />
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function PaymentGateway() {
    const { session_id } = useParams();
    const [searchParams]  = useSearchParams();
    const return_url      = searchParams.get("return_url") || "";

    const [session,        setSession]        = useState(null);
    const [sessionLoading, setSessionLoading] = useState(true);
    const [sessionErr,     setSessionErr]     = useState("");

    const [screen, setScreen] = useState("login");

    const [identifier,      setIdentifier]      = useState("");
    const [credential,      setCredential]      = useState("");
    const [showCredential,  setShowCredential]  = useState(false);
    const [loginErr,        setLoginErr]        = useState("");
    const [loggingIn,       setLoggingIn]       = useState(false);

    const [otp,            setOtp]            = useState("");
    const [remarks,        setRemarks]        = useState("");
    const [otpErr,         setOtpErr]         = useState("");
    const [verifying,      setVerifying]      = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resending,      setResending]      = useState(false);
    const resendTimer = useRef(null);

    const [result, setResult] = useState(null);

    useEffect(() => {
        getPortalSession(session_id)
            .then(d => setSession(d.session))
            .catch(e => setSessionErr(e.message || "Payment session not found or expired."))
            .finally(() => setSessionLoading(false));
    }, [session_id]);

    function startCooldown(secs = 60) {
        setResendCooldown(secs);
        clearInterval(resendTimer.current);
        resendTimer.current = setInterval(() => {
            setResendCooldown(c => {
                if (c <= 1) { clearInterval(resendTimer.current); return 0; }
                return c - 1;
            });
        }, 1000);
    }

    // ── Normalise phone → +977XXXXXXXXXX ──────────────────────
    function normaliseIdentifier(raw) {
        const id = raw.trim();
        if (id.includes("@")) return id; // email — leave as-is
        let digits = id.replace(/[\s\-().]/g, "");
        if (digits.startsWith("+977")) return digits;
        if (digits.startsWith("977"))  return `+${digits}`;
        if (digits.startsWith("0"))    digits = digits.slice(1);
        return `+977${digits}`;
    }

    async function handleLogin(e) {
        e.preventDefault();
        if (!identifier.trim()) { setLoginErr("Please enter your email or phone number."); return; }
        if (!credential.toString().trim()) {
            setLoginErr("Please enter your password or MPIN.");
            return;
        }
        setLoggingIn(true); setLoginErr("");
        try {
            const normId = normaliseIdentifier(identifier);
            await portalLogin(session_id, normId, credential.toString().trim());
            setScreen("otp");
            startCooldown(60);
        } catch (err) {
            setLoginErr(err.message || "Login failed. Please check your credentials.");
        } finally {
            setLoggingIn(false);
        }
    }

    async function handleVerifyAndPay(e) {
        e?.preventDefault();
        if (otp.replace(/\s/g, "").length < 6) { setOtpErr("Please enter the 6-digit OTP."); return; }
        setVerifying(true); setOtpErr("");
        try {
            const data = await portalVerifyAndPay(session_id, otp.trim(), remarks);
            setResult({ status: "success", txn_id: data.transaction?.transaction_id });
            setScreen("result");
            if (return_url) {
                setTimeout(() => {
                    const url = new URL(return_url);
                    url.searchParams.set("status", "success");
                    url.searchParams.set("transaction_id", data.transaction?.transaction_id || "");
                    url.searchParams.set("session_id", session_id);
                    window.location.href = url.toString();
                }, 3000);
            }
        } catch (err) {
            setOtpErr(err.message || "Incorrect OTP. Please try again.");
            setOtp("");
        } finally {
            setVerifying(false);
        }
    }

    useEffect(() => {
        if (screen === "otp" && otp.length === 6 && !verifying) handleVerifyAndPay();
    }, [otp]); // eslint-disable-line

    async function handleResend() {
        if (resendCooldown > 0 || resending) return;
        setResending(true); setOtpErr(""); setOtp("");
        try {
            await portalResendOTP(session_id);
            startCooldown(60);
        } catch (err) {
            setOtpErr(err.message || "Failed to resend OTP.");
        } finally {
            setResending(false);
        }
    }

    function handleCancel() {
        if (!return_url) return;
        const url = new URL(return_url);
        url.searchParams.set("status", "cancelled");
        url.searchParams.set("session_id", session_id);
        window.location.href = url.toString();
    }

    const expiryFormatted = session?.expires_at
        ? new Date(session.expires_at).toLocaleString("en-NP", { dateStyle: "medium", timeStyle: "short" })
        : null;

    return (
        <div className="kpw-root">
          <div className="kpw-container">

            {/* ── Left — payment details ── */}
            <div className="kpw-left">
                <div className="kpw-left-inner">
                    <KharchaWordmark />

                    {sessionLoading && (
                        <div className="kpw-left-loading"><Spinner size={26} color="var(--primary)" /></div>
                    )}

                    {!sessionLoading && sessionErr && (
                        <p className="kpw-left-err-text">This payment link is invalid or has expired.</p>
                    )}

                    {!sessionLoading && !sessionErr && session && (
                        <>
                            <h1 className="kpw-left-heading">Payment Details</h1>

                            {expiryFormatted && (
                                <div className="kpw-expiry-banner">
                                    <IconClock />
                                    <span>This payment will expire on <strong>{expiryFormatted}</strong></span>
                                </div>
                            )}

                            <div className="kpw-billed-row">
                                <span className="kpw-billed-label">Billed To:</span>
                                <span className="kpw-billed-value">{session.merchant_name}</span>
                            </div>

                            <p className="kpw-amount-summary-heading">Amount Summary:</p>
                            <div className="kpw-amount-row">
                                <span className="kpw-amount-row-label">Total Payable Amount</span>
                                <span className="kpw-amount-row-value">Rs {formatNPR(session.amount)}</span>
                            </div>

                            {session.note && (
                                <div className="kpw-details-block">
                                    <div className="kpw-detail-row">
                                        <span className="kpw-detail-label">Note</span>
                                        <span className="kpw-detail-value">{session.note}</span>
                                    </div>
                                    <div className="kpw-detail-row">
                                        <span className="kpw-detail-label">Session</span>
                                        <span className="kpw-detail-value">{String(session_id).slice(0, 8).toUpperCase()}…</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    <KharchaPoweredLogo />
                </div>
            </div>

            {/* ── Right — auth/pay flow ── */}
            <div className="kpw-right">
                <div className="kpw-right-inner">

                    {/* Session error */}
                    {!sessionLoading && sessionErr && (
                        <div className="kpw-panel kpw-panel--result">
                            <div className="kpw-result-icon kpw-result-icon--fail"><IconXCircle /></div>
                            <h2 className="kpw-result-title">Invalid Link</h2>
                            <p className="kpw-result-sub">{sessionErr}</p>
                            {return_url && (
                                <button className="kpw-btn kpw-btn--ghost" onClick={handleCancel}>
                                    Return to Merchant
                                </button>
                            )}
                        </div>
                    )}

                    {/* ── Screen: login ── */}
                    {!sessionErr && !sessionLoading && screen === "login" && (
                        <div className="kpw-panel">
                            <div className="kpw-panel-topbar">
                                <div className="kpw-panel-icon"><IconMail /></div>
                                <h2>Sign in to Pay</h2>
                            </div>
                            <div className="kpw-panel-body">
                                <div className="kpw-panel-head">
                                    <p>Use your Kharcha account credentials to authorise this payment.</p>
                                </div>

                                <form className="kpw-form" onSubmit={handleLogin} noValidate>
                                    <div className="kpw-field">
                                        <label className="kpw-label">Mobile Number or Email</label>
                                        <input
                                            className="kpw-input"
                                            type="text"
                                            placeholder="98XXXXXXXX or you@email.com"
                                            value={identifier}
                                            onChange={e => { setIdentifier(e.target.value); setLoginErr(""); }}
                                            autoFocus
                                            autoComplete="username"
                                        />
                                    </div>

                                    <div className="kpw-field">
                                        <label className="kpw-label">Password / MPIN</label>
                                        <div className="kpw-input-wrap">
                                            <input
                                                className={`kpw-input kpw-input--icon-right${loginErr ? " kpw-input--err" : ""}`}
                                                type={showCredential ? "text" : "password"}
                                                placeholder="Enter your password or MPIN"
                                                value={credential}
                                                onChange={e => { setCredential(e.target.value); setLoginErr(""); }}
                                                autoComplete="current-password"
                                            />
                                            <button type="button" className="kpw-eye-btn"
                                                onClick={() => setShowCredential(v => !v)}
                                                tabIndex={-1} aria-label={showCredential ? "Hide" : "Show"}>
                                                <IconEye off={showCredential} />
                                            </button>
                                        </div>
                                    </div>

                                    {loginErr && <p className="kpw-err-text">{loginErr}</p>}

                                    <button className="kpw-btn kpw-btn--primary" type="submit"
                                        disabled={loggingIn || !identifier.trim() || !credential.toString().trim()}>
                                        {loggingIn
                                            ? <><Spinner size={16} color="#fff" /> Signing in…</>
                                            : "Continue →"}
                                    </button>
                                </form>
                            </div>

                            {return_url && (
                                <div className="kpw-panel-cancel-row">
                                    <button type="button" className="kpw-cancel-link" onClick={handleCancel}>
                                        Cancel Payment
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Screen: OTP ── */}
                    {!sessionErr && screen === "otp" && session && (
                        <div className="kpw-panel">
                            <div className="kpw-panel-topbar">
                                <button className="kpw-back-btn"
                                    onClick={() => { setScreen("login"); setOtp(""); setOtpErr(""); }}>
                                    <IconBack />
                                </button>
                                <h2>Pay via Kharcha Wallet</h2>
                            </div>

                            <div className="kpw-panel-body">
                                <p className="kpw-otp-enter-label">Enter OTP</p>

                                <div className="kpw-field">
                                    <label className="kpw-label">Mobile Number or Email</label>
                                    <input
                                        className="kpw-input kpw-input--readonly"
                                        type="text"
                                        value={identifier}
                                        disabled
                                        readOnly
                                    />
                                </div>

                                <div className="kpw-field">
                                    <label className="kpw-label">Password / MPIN</label>
                                    <div className="kpw-input-wrap">
                                        <input
                                            className="kpw-input kpw-input--icon-right kpw-input--readonly"
                                            type="password"
                                            value={credential}
                                            disabled
                                            readOnly
                                        />
                                        <span className="kpw-eye-btn" style={{ cursor: "default" }}>
                                            <IconEye off={false} />
                                        </span>
                                    </div>
                                </div>

                                <p className="kpw-otp-section-label">
                                    Enter OTP sent to your Mobile Number / Email Address
                                </p>

                                <OTPInput length={6} value={otp} onChange={setOtp} disabled={verifying} />

                                {otpErr && <p className="kpw-err-text kpw-err-text--center">{otpErr}</p>}

                                <button className="kpw-btn kpw-btn--pay" onClick={handleVerifyAndPay}
                                    disabled={verifying || otp.length < 6}>
                                    {verifying
                                        ? <><Spinner size={16} color="#fff" /> Processing…</>
                                        : `Pay Rs. ${formatNPR(session.amount)}`}
                                </button>

                                <div className="kpw-forgot-row">
                                    Forgot your password?{" "}
                                    <button type="button" onClick={() => {}}>Reset Password</button>
                                </div>

                                <div className="kpw-field kpw-remarks-field">
                                    <label className="kpw-label">
                                        Remarks <span className="kpw-optional">(optional)</span>
                                    </label>
                                    <input className="kpw-input" type="text"
                                        placeholder="What's this payment for?"
                                        maxLength={120} value={remarks}
                                        onChange={e => setRemarks(e.target.value)}
                                        disabled={verifying} />
                                </div>

                                <div className="kpw-resend-row">
                                    {resendCooldown > 0
                                        ? <span className="kpw-resend-timer">Resend OTP in <strong>{resendCooldown}s</strong></span>
                                        : <button type="button" className="kpw-resend-btn"
                                            onClick={handleResend} disabled={resending}>
                                            {resending ? "Resending…" : "Resend OTP"}
                                        </button>
                                    }
                                </div>
                            </div>

                            {return_url && (
                                <div className="kpw-panel-cancel-row">
                                    <button type="button" className="kpw-cancel-link" onClick={handleCancel}>
                                        Cancel Payment
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Screen: Result ── */}
                    {screen === "result" && result && session && (
                        <div className="kpw-panel kpw-panel--result">
                            {result.status === "success" ? (
                                <>
                                    <div className="kpw-result-icon kpw-result-icon--success"><IconCheck /></div>
                                    <h2 className="kpw-result-title">Payment Successful!</h2>
                                    <div className="kpw-result-amount">Rs {formatNPR(session.amount)}</div>
                                    <p className="kpw-result-sub">
                                        Paid to <strong>{session.merchant_name}</strong>
                                    </p>
                                    {result.txn_id && (
                                        <p className="kpw-result-txn">
                                            Txn: {String(result.txn_id).slice(0, 18)}…
                                        </p>
                                    )}
                                    <p className="kpw-result-redirect">
                                        {return_url ? "Redirecting back in 3 seconds…" : "You may close this window."}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="kpw-result-icon kpw-result-icon--fail"><IconXCircle /></div>
                                    <h2 className="kpw-result-title">Payment Failed</h2>
                                    <p className="kpw-result-sub">{result.message || "Something went wrong."}</p>
                                    {return_url && (
                                        <button className="kpw-btn kpw-btn--ghost" onClick={handleCancel}>
                                            Return to Merchant
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                </div>
            </div>

          </div>{/* /.kpw-container */}
        </div>
    );
}