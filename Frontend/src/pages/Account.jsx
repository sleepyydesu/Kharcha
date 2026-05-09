import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    getProfile,
    uploadProfilePicture,
    deleteProfilePicture,
    submitKYC,
    getMpinStatus,
    setupMpin,
    changeMpin,
    sendPasswordResetOTP,
    resetPassword,
    signOut,
    biometricRegisterApi,
    verifyMpinApi,
} from "../services/api";
import { useNotifications } from "../context/NotificationContext";
import {
    isBiometricAvailable,
    getSavedBiometricUser,
    registerBiometric,
    clearSavedBiometricUser,
    registerBiometricTx,
    getSavedBiometricTxUser,
    clearSavedBiometricTxUser,
} from "../hooks/useBiometric";
import "./Account.css";

// ── Helpers ───────────────────────────────────────────────────
function fmtDate(iso) {
    return new Date(iso).toLocaleDateString("en-NP", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function Avatar({ name, src, size = 80, onClick }) {
    const initials = (name || "?")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    return (
        <div
            className="acct-avatar-wrap"
            style={{ width: size, height: size }}
            onClick={onClick}
        >
            {src ? (
                <img
                    className="acct-avatar acct-avatar--img"
                    src={src}
                    alt={name}
                    style={{ width: size, height: size }}
                />
            ) : (
                <span
                    className="acct-avatar acct-avatar--initials"
                    style={{ width: size, height: size, fontSize: size * 0.33 }}
                >
                    {initials}
                </span>
            )}
            {onClick && (
                <div className="acct-avatar-overlay">
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                    >
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                    </svg>
                </div>
            )}
        </div>
    );
}

function SectionTitle({ icon, children }) {
    return (
        <div className="acct-section-title">
            {icon}
            <span>{children}</span>
        </div>
    );
}

function Toast({ msg, type, onDone }) {
    useEffect(() => {
        if (!msg) return;
        const t = setTimeout(onDone, 3200);
        return () => clearTimeout(t);
    }, [msg]);
    if (!msg) return null;
    return (
        <div className={`acct-toast acct-toast--${type}`}>
            {type === "success" ? (
                <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                >
                    <path d="M20 6 9 17l-5-5" />
                </svg>
            ) : (
                <svg
                    width="15"
                    height="15"
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

// ── PIN input ─────────────────────────────────────────────────
function PinInput({ label, value, onChange, placeholder = "••••••" }) {
    const [show, setShow] = useState(false);
    return (
        <div className="acct-field">
            <label className="acct-label">{label}</label>
            <div className="acct-input-wrap">
                <input
                    className="acct-input acct-input--pin"
                    type={show ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) =>
                        onChange(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    autoComplete="off"
                />
                <button
                    type="button"
                    className="acct-toggle-eye"
                    onClick={() => setShow((s) => !s)}
                    tabIndex={-1}
                >
                    {show ? (
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                    ) : (
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
}

// ── KYC card ──────────────────────────────────────────────────
function KYCCard({ email, onSuccess, toast }) {
    const [dob, setDob] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!dob) return toast("Please enter your date of birth.", "error");
        setLoading(true);
        try {
            await submitKYC({ dob });
            toast(
                "Verification request submitted! An admin will review it shortly.",
                "success",
            );
            onSuccess();
        } catch (err) {
            toast(err.message || "Submission failed.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="acct-card acct-card--kyc">
            <div className="acct-kyc-icon">
                <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                </svg>
            </div>
            <div className="acct-kyc-body">
                <h3 className="acct-kyc-title">Verify Your Account</h3>
                <p className="acct-kyc-desc">
                    Your account is not yet verified. Complete KYC to unlock all
                    wallet features and transactions.
                </p>
                <div className="acct-kyc-form">
                    <div className="acct-field">
                        <label className="acct-label">Date of Birth</label>
                        <input
                            className="acct-input"
                            type="date"
                            value={dob}
                            onChange={(e) => setDob(e.target.value)}
                            max={new Date(
                                Date.now() - 16 * 365.25 * 24 * 3600 * 1000,
                            )
                                .toISOString()
                                .slice(0, 10)}
                        />
                    </div>
                    <button
                        className="acct-btn acct-btn--primary"
                        onClick={handleSubmit}
                        disabled={loading || !dob}
                    >
                        {loading ? <span className="acct-spinner" /> : null}
                        {loading
                            ? "Submitting…"
                            : "Submit Verification Request"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Setup MPIN card (first time) ──────────────────────────────
function SetupMpinCard({ onSuccess, toast }) {
    const { dismiss } = useNotifications();
    const [pw, setPw] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConf] = useState("");
    const [loading, setLoad] = useState(false);
    const [open, setOpen] = useState(false);
    const [showPw, setShowPw] = useState(false);

    const handle = async () => {
        if (!pw) return toast("Please enter your account password.", "error");
        if (next.length !== 6 || isNaN(next))
            return toast("MPIN must be exactly 6 digits.", "error");
        if (next !== confirm) return toast("MPINs do not match.", "error");
        setLoad(true);
        try {
            await setupMpin({ password: pw, mpin: next });
            dismiss("mpin_setup_prompt"); // clear the notification
            toast(
                "MPIN set up successfully! You can now use your MPIN to sign in.",
                "success",
            );
            setPw("");
            setNext("");
            setConf("");
            setOpen(false);
            onSuccess();
        } catch (err) {
            toast(err.message || "Failed to set up MPIN.", "error");
        } finally {
            setLoad(false);
        }
    };

    return (
        <div className="acct-card acct-card--action acct-card--mpin-setup">
            <button
                className="acct-action-header"
                onClick={() => setOpen((o) => !o)}
            >
                <div className="acct-action-icon acct-action-icon--amber">
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <rect
                            x="3"
                            y="11"
                            width="18"
                            height="11"
                            rx="2"
                            ry="2"
                        />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        <circle cx="12" cy="16" r="1" fill="currentColor" />
                    </svg>
                </div>
                <div className="acct-action-info">
                    <span className="acct-action-title">
                        Set Up MPIN
                        <span className="acct-mpin-badge">Not configured</span>
                    </span>
                    <span className="acct-action-sub">
                        Create your 6-digit transaction PIN to unlock payments
                    </span>
                </div>
                <svg
                    className={`acct-chevron ${open ? "acct-chevron--open" : ""}`}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {open && (
                <div className="acct-action-body">
                    <div className="acct-mpin-info-box">
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
                        <span>
                            Your account password is required to verify your
                            identity before setting a new MPIN.
                        </span>
                    </div>

                    {/* Password field */}
                    <div className="acct-field">
                        <label className="acct-field-label">
                            Account Password
                        </label>
                        <div className="acct-input-wrap">
                            <input
                                className="acct-input"
                                type={showPw ? "text" : "password"}
                                placeholder="Enter your current password"
                                value={pw}
                                onChange={(e) => setPw(e.target.value)}
                            />
                            <button
                                type="button"
                                className="acct-eye-btn"
                                onClick={() => setShowPw((s) => !s)}
                                tabIndex={-1}
                            >
                                {showPw ? (
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                ) : (
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <PinInput
                        label="New MPIN (6 digits)"
                        value={next}
                        onChange={setNext}
                    />
                    <PinInput
                        label="Confirm MPIN"
                        value={confirm}
                        onChange={setConf}
                    />

                    <div className="acct-action-btns">
                        <button
                            className="acct-btn acct-btn--primary"
                            onClick={handle}
                            disabled={
                                loading || !pw || next.length < 6 || !confirm
                            }
                        >
                            {loading ? <span className="acct-spinner" /> : null}
                            {loading ? "Setting up…" : "Set Up MPIN"}
                        </button>
                        <button
                            className="acct-btn acct-btn--ghost"
                            onClick={() => {
                                setOpen(false);
                                setPw("");
                                setNext("");
                                setConf("");
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Change MPIN card ──────────────────────────────────────────
function ChangeMpinCard({ toast }) {
    const [cur, setCur] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConf] = useState("");
    const [loading, setLoad] = useState(false);
    const [open, setOpen] = useState(false);

    const handle = async () => {
        if (next.length !== 6)
            return toast("New MPIN must be exactly 6 digits.", "error");
        if (next !== confirm) return toast("MPINs do not match.", "error");
        setLoad(true);
        try {
            await changeMpin({ current_mpin: cur, new_mpin: next });
            toast("MPIN updated successfully.", "success");
            setCur("");
            setNext("");
            setConf("");
            setOpen(false);
        } catch (err) {
            toast(err.message || "Failed to change MPIN.", "error");
        } finally {
            setLoad(false);
        }
    };

    return (
        <div className="acct-card acct-card--action">
            <button
                className="acct-action-header"
                onClick={() => setOpen((o) => !o)}
            >
                <div className="acct-action-icon acct-action-icon--blue">
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <rect
                            x="3"
                            y="11"
                            width="18"
                            height="11"
                            rx="2"
                            ry="2"
                        />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                </div>
                <div className="acct-action-info">
                    <span className="acct-action-title">Change MPIN</span>
                    <span className="acct-action-sub">
                        Update your 6-digit transaction PIN
                    </span>
                </div>
                <svg
                    className={`acct-chevron ${open ? "acct-chevron--open" : ""}`}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {open && (
                <div className="acct-action-body">
                    <PinInput
                        label="Current MPIN"
                        value={cur}
                        onChange={setCur}
                    />
                    <PinInput
                        label="New MPIN"
                        value={next}
                        onChange={setNext}
                    />
                    <PinInput
                        label="Confirm New MPIN"
                        value={confirm}
                        onChange={setConf}
                    />
                    <div className="acct-action-btns">
                        <button
                            className="acct-btn acct-btn--primary"
                            onClick={handle}
                            disabled={
                                loading || !cur || next.length < 6 || !confirm
                            }
                        >
                            {loading ? <span className="acct-spinner" /> : null}
                            {loading ? "Saving…" : "Save New MPIN"}
                        </button>
                        <button
                            className="acct-btn acct-btn--ghost"
                            onClick={() => {
                                setOpen(false);
                                setCur("");
                                setNext("");
                                setConf("");
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Biometric transaction card ────────────────────────────────
// User must confirm their current MPIN first (like Change MPIN),
// then we run WebAuthn enrollment and store a tx-specific credential.
function BiometricTransactionCard({ toast, profile }) {
    const [status, setStatus] = useState(null); // null | false | "enrolled" | "unenrolled"
    const [open, setOpen]     = useState(false);
    const [step, setStep]     = useState("mpin"); // "mpin" | "enrolling" | "done"
    const [mpin, setMpin]     = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function check() {
            const available = await isBiometricAvailable();
            if (!available) { setStatus(false); return; }
            setStatus(getSavedBiometricTxUser() ? "enrolled" : "unenrolled");
        }
        check();
    }, []);

    // Hidden on unsupported devices
    if (status === false) return null;

    function handleOpen() {
        setOpen((o) => !o);
        setStep("mpin");
        setMpin("");
    }

    async function handleConfirmMpin() {
        if (mpin.length < 4) return toast("Enter your MPIN (4–6 digits).", "error");
        setLoading(true);
        try {
            await verifyMpinApi({ mpin });
            setStep("enrolling");
        } catch (err) {
            toast(
                err.message?.includes("401") || err.message?.includes("Incorrect")
                    ? "Incorrect MPIN. Please try again."
                    : err.message || "MPIN verification failed.",
                "error",
            );
        } finally {
            setLoading(false);
        }
    }

    async function handleEnroll() {
        setLoading(true);
        try {
            await registerBiometricTx(
                { email: profile.email, display_name: profile.full_name || profile.email },
                biometricRegisterApi,
            );
            setStatus("enrolled");
            setStep("done");
            toast("Fingerprint payment enabled. You can now send money without entering your MPIN.", "success");
        } catch (err) {
            if (err.name === "NotAllowedError") {
                toast("Fingerprint setup was cancelled.", "error");
            } else {
                toast(err.message || "Failed to set up fingerprint for payments.", "error");
            }
        } finally {
            setLoading(false);
        }
    }

    function handleRemove() {
        clearSavedBiometricTxUser();
        setStatus("unenrolled");
        setOpen(false);
        toast("Fingerprint payments removed from this device.", "success");
    }

    const isEnrolled = status === "enrolled";

    return (
        <div className="acct-card acct-card--action">
            <button className="acct-action-header" onClick={handleOpen}>
                <div className={`acct-action-icon ${isEnrolled ? "acct-action-icon--green" : "acct-action-icon--amber"}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                </div>
                <div className="acct-action-info">
                    <span className="acct-action-title">
                        Fingerprint Payments
                        {status === null && <span className="acct-mpin-badge" style={{ marginLeft: 8 }}>Checking…</span>}
                        {isEnrolled && <span className="acct-mpin-badge acct-mpin-badge--active" style={{ marginLeft: 8 }}>Active</span>}
                    </span>
                    <span className="acct-action-sub">
                        {isEnrolled
                            ? "Send money without typing your MPIN"
                            : "Authorise transfers with your fingerprint instead of MPIN"}
                    </span>
                </div>
                <svg className={`acct-chevron ${open ? "acct-chevron--open" : ""}`}
                    width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {open && (
                <div className="acct-action-body">
                    {isEnrolled ? (
                        <>
                            <div className="acct-biometric-status">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                    stroke="var(--success, #38a169)" strokeWidth="2.5" strokeLinecap="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>
                                    Fingerprint payments are <strong>active</strong>. A fingerprint
                                    button will appear on the Send Money confirmation screen.
                                </span>
                            </div>
                            <div className="acct-action-btns">
                                <button className="acct-btn acct-btn--danger" onClick={handleRemove}>
                                    Remove Fingerprint Payments
                                </button>
                                <button className="acct-btn acct-btn--ghost" onClick={() => setOpen(false)}>
                                    Cancel
                                </button>
                            </div>
                        </>
                    ) : step === "mpin" ? (
                        <>
                            <p className="acct-biometric-hint">
                                To set up fingerprint payments, first confirm your MPIN.
                                This ensures only you can enable this feature.
                            </p>
                            <PinInput label="Current MPIN" value={mpin} onChange={setMpin} />
                            <div className="acct-action-btns">
                                <button
                                    className="acct-btn acct-btn--primary"
                                    onClick={handleConfirmMpin}
                                    disabled={loading || mpin.length < 4}
                                >
                                    {loading ? <span className="acct-spinner" /> : null}
                                    {loading ? "Verifying…" : "Verify MPIN"}
                                </button>
                                <button className="acct-btn acct-btn--ghost"
                                    onClick={() => { setOpen(false); setMpin(""); }}>
                                    Cancel
                                </button>
                            </div>
                        </>
                    ) : step === "enrolling" ? (
                        <>
                            <p className="acct-biometric-hint">
                                MPIN confirmed. Now register your fingerprint to authorise
                                future payments — your device will prompt you to scan it.
                            </p>
                            <div className="acct-action-btns">
                                <button
                                    className="acct-btn acct-btn--primary"
                                    onClick={handleEnroll}
                                    disabled={loading}
                                >
                                    {loading ? <span className="acct-spinner" /> : null}
                                    {loading ? "Registering…" : "Scan Fingerprint"}
                                </button>
                                <button className="acct-btn acct-btn--ghost"
                                    onClick={() => { setStep("mpin"); setMpin(""); }}>
                                    Back
                                </button>
                            </div>
                        </>
                    ) : (
                        // step === "done"
                        <div className="acct-biometric-status">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                stroke="var(--success, #38a169)" strokeWidth="2.5" strokeLinecap="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>Fingerprint payments are now active on this device.</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Biometric login card ──────────────────────────────────────
function BiometricCard({ toast, profile }) {
    // null = checking, false = unsupported, "enrolled" | "unenrolled" = known
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        async function check() {
            const available = await isBiometricAvailable();
            if (!available) { setStatus(false); return; }
            const saved = getSavedBiometricUser();
            setStatus(saved ? "enrolled" : "unenrolled");
        }
        check();
    }, []);

    // Device doesn't support biometrics — render nothing
    if (status === false) return null;

    async function handleEnroll() {
        setLoading(true);
        try {
            await registerBiometric(
                { email: profile.email, display_name: profile.full_name || profile.email },
                biometricRegisterApi,
            );
            setStatus("enrolled");
            toast("Fingerprint login enabled for this device.", "success");
        } catch (err) {
            if (err.name === "NotAllowedError") {
                toast("Fingerprint setup was cancelled.", "error");
            } else {
                toast(err.message || "Failed to set up fingerprint login.", "error");
            }
        } finally {
            setLoading(false);
        }
    }

    function handleRemove() {
        clearSavedBiometricUser();
        setStatus("unenrolled");
        toast("Fingerprint login removed from this device.", "success");
    }

    const isEnrolled = status === "enrolled";
    const savedUser  = getSavedBiometricUser();

    return (
        <div className="acct-card acct-card--action">
            <button
                className="acct-action-header"
                onClick={() => setOpen((o) => !o)}
            >
                <div className={`acct-action-icon ${isEnrolled ? "acct-action-icon--green" : "acct-action-icon--blue"}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                </div>
                <div className="acct-action-info">
                    <span className="acct-action-title">
                        Fingerprint Login
                        {status === null && (
                            <span className="acct-mpin-badge" style={{ marginLeft: 8 }}>Checking…</span>
                        )}
                        {isEnrolled && (
                            <span className="acct-mpin-badge acct-mpin-badge--active" style={{ marginLeft: 8 }}>
                                Active
                            </span>
                        )}
                    </span>
                    <span className="acct-action-sub">
                        {isEnrolled
                            ? `Enabled for ${savedUser?.displayName ?? "this device"}`
                            : "Sign in faster using your device's fingerprint or Face ID"}
                    </span>
                </div>
                <svg className={`acct-chevron ${open ? "acct-chevron--open" : ""}`}
                    width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {open && (
                <div className="acct-action-body">
                    {isEnrolled ? (
                        <>
                            <div className="acct-biometric-status">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                    stroke="var(--success, #38a169)" strokeWidth="2.5" strokeLinecap="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>
                                    Fingerprint login is <strong>active</strong> on this device.
                                    You can tap the fingerprint button on the login screen to sign in instantly.
                                </span>
                            </div>
                            <div className="acct-action-btns">
                                <button
                                    className="acct-btn acct-btn--danger"
                                    onClick={handleRemove}
                                >
                                    Remove Fingerprint
                                </button>
                                <button
                                    className="acct-btn acct-btn--ghost"
                                    onClick={() => setOpen(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="acct-biometric-hint">
                                Your device supports biometric authentication. Set it up once
                                and you'll be able to sign in with just a fingerprint or Face ID
                                — no password needed.
                            </p>
                            <div className="acct-action-btns">
                                <button
                                    className="acct-btn acct-btn--primary"
                                    onClick={handleEnroll}
                                    disabled={loading}
                                >
                                    {loading ? <span className="acct-spinner" /> : null}
                                    {loading ? "Setting up…" : "Set Up Fingerprint Login"}
                                </button>
                                <button
                                    className="acct-btn acct-btn--ghost"
                                    onClick={() => setOpen(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Change Password card ──────────────────────────────────────
function ChangePasswordCard({ email, toast }) {
    const [step, setStep] = useState(0); // 0=idle, 1=otp-sent, 2=done
    const [otp, setOtp] = useState("");
    const [newPw, setNewPw] = useState("");
    const [confirm, setConf] = useState("");
    const [loading, setLoad] = useState(false);
    const [open, setOpen] = useState(false);
    const [showPw, setShowPw] = useState(false);

    const reset = () => {
        setStep(0);
        setOtp("");
        setNewPw("");
        setConf("");
        setOpen(false);
    };

    const sendOTP = async () => {
        setLoad(true);
        try {
            await sendPasswordResetOTP({ email });
            setStep(1);
            toast(`A reset code was sent to ${email}`, "success");
        } catch (err) {
            toast(err.message || "Failed to send code.", "error");
        } finally {
            setLoad(false);
        }
    };

    const doReset = async () => {
        if (newPw.length < 8)
            return toast("Password must be at least 8 characters.", "error");
        if (newPw !== confirm) return toast("Passwords do not match.", "error");
        setLoad(true);
        try {
            await resetPassword({ email, otp, new_password: newPw });
            toast("Password updated successfully.", "success");
            reset();
        } catch (err) {
            toast(err.message || "Failed to reset password.", "error");
        } finally {
            setLoad(false);
        }
    };

    return (
        <div className="acct-card acct-card--action">
            <button
                className="acct-action-header"
                onClick={() => setOpen((o) => !o)}
            >
                <div className="acct-action-icon acct-action-icon--amber">
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
                    </svg>
                </div>
                <div className="acct-action-info">
                    <span className="acct-action-title">Change Password</span>
                    <span className="acct-action-sub">
                        A verification code will be sent to your email
                    </span>
                </div>
                <svg
                    className={`acct-chevron ${open ? "acct-chevron--open" : ""}`}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {open && (
                <div className="acct-action-body">
                    {step === 0 && (
                        <>
                            <p className="acct-action-hint">
                                We'll send a one-time code to{" "}
                                <strong>{email}</strong> to verify it's you.
                            </p>
                            <div className="acct-action-btns">
                                <button
                                    className="acct-btn acct-btn--primary"
                                    onClick={sendOTP}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <span className="acct-spinner" />
                                    ) : null}
                                    {loading
                                        ? "Sending…"
                                        : "Send Verification Code"}
                                </button>
                                <button
                                    className="acct-btn acct-btn--ghost"
                                    onClick={reset}
                                >
                                    Cancel
                                </button>
                            </div>
                        </>
                    )}
                    {step === 1 && (
                        <>
                            <div className="acct-field">
                                <label className="acct-label">
                                    Verification Code
                                </label>
                                <input
                                    className="acct-input"
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    placeholder="6-digit code"
                                    value={otp}
                                    onChange={(e) =>
                                        setOtp(
                                            e.target.value
                                                .replace(/\D/g, "")
                                                .slice(0, 6),
                                        )
                                    }
                                />
                            </div>
                            <div className="acct-field">
                                <label className="acct-label">
                                    New Password
                                </label>
                                <div className="acct-input-wrap">
                                    <input
                                        className="acct-input"
                                        type={showPw ? "text" : "password"}
                                        placeholder="Min. 8 characters"
                                        value={newPw}
                                        onChange={(e) =>
                                            setNewPw(e.target.value)
                                        }
                                    />
                                    <button
                                        type="button"
                                        className="acct-toggle-eye"
                                        onClick={() => setShowPw((s) => !s)}
                                        tabIndex={-1}
                                    >
                                        {showPw ? (
                                            <svg
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                            >
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                <line
                                                    x1="1"
                                                    y1="1"
                                                    x2="23"
                                                    y2="23"
                                                />
                                            </svg>
                                        ) : (
                                            <svg
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                            >
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div className="acct-field">
                                <label className="acct-label">
                                    Confirm New Password
                                </label>
                                <input
                                    className="acct-input"
                                    type="password"
                                    placeholder="Repeat new password"
                                    value={confirm}
                                    onChange={(e) => setConf(e.target.value)}
                                />
                            </div>
                            <div className="acct-action-btns">
                                <button
                                    className="acct-btn acct-btn--primary"
                                    onClick={doReset}
                                    disabled={
                                        loading ||
                                        otp.length < 6 ||
                                        newPw.length < 8 ||
                                        !confirm
                                    }
                                >
                                    {loading ? (
                                        <span className="acct-spinner" />
                                    ) : null}
                                    {loading ? "Saving…" : "Set New Password"}
                                </button>
                                <button
                                    className="acct-btn acct-btn--ghost"
                                    onClick={reset}
                                >
                                    Cancel
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Main Account page ─────────────────────────────────────────
export default function Account() {
    const navigate = useNavigate();
    const fileRef = useRef();
    const { dismiss } = useNotifications();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [kycDone, setKycDone] = useState(false);
    // null = loading, true/false = known
    const [mpinSet, setMpinSet] = useState(null);

    // Theme
    const [theme, setTheme] = useState(
        () => localStorage.getItem("kharcha-theme") || "light",
    );

    const [toast, setToastState] = useState({ msg: "", type: "success" });
    const showToast = (msg, type = "success") => setToastState({ msg, type });

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("kharcha-theme", theme);
    }, [theme]);

    useEffect(() => {
        setLoading(true);
        Promise.all([getProfile(), getMpinStatus()])
            .then(([profileRes, mpinRes]) => {
                setProfile(profileRes.profile);
                setMpinSet(mpinRes.mpin_set);
            })
            .catch((err) => setError(err.message || "Failed to load profile."))
            .finally(() => setLoading(false));
    }, []);

    // ── Avatar upload ────────────────────────────────────────────
    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024)
            return showToast("Image must be under 5 MB.", "error");

        setUploading(true);
        try {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const base64 = ev.target.result.split(",")[1];
                const res = await uploadProfilePicture({
                    file_base64: base64,
                    mime_type: file.type,
                });
                setProfile((p) => ({
                    ...p,
                    profile_picture_url: res.profile_picture_url,
                }));
                showToast("Profile picture updated.", "success");
                setUploading(false);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            showToast(err.message || "Upload failed.", "error");
            setUploading(false);
        }
    };

    const handleRemoveAvatar = async () => {
        setUploading(true);
        try {
            await deleteProfilePicture();
            setProfile((p) => ({ ...p, profile_picture_url: null }));
            showToast("Profile picture removed.", "success");
        } catch (err) {
            showToast(err.message || "Failed to remove picture.", "error");
        } finally {
            setUploading(false);
        }
    };

    // ── Logout ───────────────────────────────────────────────────
    const handleLogout = async () => {
        try {
            await signOut();
        } catch {
            // ignore — clear local state regardless
        }
        localStorage.removeItem("kharcha_session");
        navigate("/");
        window.location.reload();
    };

    const displayName =
        profile?.full_name ||
        profile?.organization_name ||
        profile?.email ||
        "Account";
    const isVerified = profile?.is_verified;
    const showKYC = profile?.account_type === "user" && !isVerified && !kycDone;

    return (
        <div className="acct-page">
            <div className="acct-container">
                <Toast
                    msg={toast.msg}
                    type={toast.type}
                    onDone={() => setToastState({ msg: "", type: "success" })}
                />

                {/* ── Header ── */}
                <div className="acct-page-header">
                    <h1 className="acct-title">Account</h1>
                    {/* Theme toggle in header */}
                    <button
                        className="acct-theme-toggle"
                        onClick={() =>
                            setTheme((t) => (t === "light" ? "dark" : "light"))
                        }
                        title={
                            theme === "light"
                                ? "Switch to dark mode"
                                : "Switch to light mode"
                        }
                    >
                        {theme === "light" ? (
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        ) : (
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <circle cx="12" cy="12" r="5" />
                                <line x1="12" y1="1" x2="12" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="23" />
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                <line
                                    x1="18.36"
                                    y1="18.36"
                                    x2="19.78"
                                    y2="19.78"
                                />
                                <line x1="1" y1="12" x2="3" y2="12" />
                                <line x1="21" y1="12" x2="23" y2="12" />
                                <line
                                    x1="4.22"
                                    y1="19.78"
                                    x2="5.64"
                                    y2="18.36"
                                />
                                <line
                                    x1="18.36"
                                    y1="5.64"
                                    x2="19.78"
                                    y2="4.22"
                                />
                            </svg>
                        )}
                        <span>
                            {theme === "light" ? "Dark mode" : "Light mode"}
                        </span>
                    </button>
                </div>

                {/* ── Loading skeleton ── */}
                {loading && (
                    <div className="acct-skeletons">
                        <div className="acct-skeleton acct-skeleton--profile" />
                        <div className="acct-skeleton acct-skeleton--card" />
                        <div className="acct-skeleton acct-skeleton--card" />
                    </div>
                )}

                {error && (
                    <div className="acct-error">
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {error}
                    </div>
                )}

                {!loading && !error && profile && (
                    <>
                        {/* ── Profile card ── */}
                        <div className="acct-card acct-card--profile">
                            <div className="acct-profile-top">
                                <div className="acct-avatar-section">
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        style={{ display: "none" }}
                                        onChange={handleAvatarChange}
                                    />
                                    <Avatar
                                        name={displayName}
                                        src={profile.profile_picture_url}
                                        size={84}
                                        onClick={
                                            uploading
                                                ? undefined
                                                : () => fileRef.current?.click()
                                        }
                                    />
                                    {uploading && (
                                        <div className="acct-avatar-uploading">
                                            <span className="acct-spinner acct-spinner--white" />
                                        </div>
                                    )}
                                    <div className="acct-avatar-actions">
                                        <button
                                            className="acct-avatar-btn"
                                            onClick={() =>
                                                fileRef.current?.click()
                                            }
                                            disabled={uploading}
                                        >
                                            {profile.profile_picture_url
                                                ? "Change Photo"
                                                : "Upload Photo"}
                                        </button>
                                        {profile.profile_picture_url && (
                                            <button
                                                className="acct-avatar-btn acct-avatar-btn--remove"
                                                onClick={handleRemoveAvatar}
                                                disabled={uploading}
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="acct-profile-info">
                                    <div className="acct-profile-name-row">
                                        <h2 className="acct-profile-name">
                                            {displayName}
                                        </h2>
                                        {isVerified ? (
                                            <span className="acct-badge acct-badge--verified">
                                                <svg
                                                    width="11"
                                                    height="11"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="3"
                                                >
                                                    <path d="M20 6 9 17l-5-5" />
                                                </svg>
                                                Verified
                                            </span>
                                        ) : (
                                            <span className="acct-badge acct-badge--unverified">
                                                Unverified
                                            </span>
                                        )}
                                    </div>
                                    <div className="acct-profile-meta">
                                        {profile.email && (
                                            <div className="acct-meta-row">
                                                <svg
                                                    width="13"
                                                    height="13"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                >
                                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                                    <polyline points="22,6 12,13 2,6" />
                                                </svg>
                                                <span>{profile.email}</span>
                                            </div>
                                        )}
                                        {profile.phone_number && (
                                            <div className="acct-meta-row">
                                                <svg
                                                    width="13"
                                                    height="13"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                >
                                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.65 4.37 2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                                </svg>
                                                <span>
                                                    {profile.phone_number}
                                                </span>
                                            </div>
                                        )}
                                        {profile.created_at && (
                                            <div className="acct-meta-row">
                                                <svg
                                                    width="13"
                                                    height="13"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                >
                                                    <rect
                                                        x="3"
                                                        y="4"
                                                        width="18"
                                                        height="18"
                                                        rx="2"
                                                    />
                                                    <line
                                                        x1="16"
                                                        y1="2"
                                                        x2="16"
                                                        y2="6"
                                                    />
                                                    <line
                                                        x1="8"
                                                        y1="2"
                                                        x2="8"
                                                        y2="6"
                                                    />
                                                    <line
                                                        x1="3"
                                                        y1="10"
                                                        x2="21"
                                                        y2="10"
                                                    />
                                                </svg>
                                                <span>
                                                    Member since{" "}
                                                    {fmtDate(
                                                        profile.created_at,
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Wallet balance */}
                            {profile.wallet && (
                                <div className="acct-wallet-strip">
                                    <svg
                                        width="15"
                                        height="15"
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
                                    <span className="acct-wallet-label">
                                        Wallet Balance
                                    </span>
                                    <span className="acct-wallet-val">
                                        Rs.{" "}
                                        {Number(
                                            profile.wallet.balance,
                                        ).toLocaleString("en-IN", {
                                            minimumFractionDigits: 2,
                                        })}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* ── KYC card ── */}
                        {showKYC && (
                            <KYCCard
                                email={profile.email}
                                onSuccess={() => setKycDone(true)}
                                toast={showToast}
                            />
                        )}

                        {kycDone && (
                            <div className="acct-card acct-card--pending">
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                                <div>
                                    <strong>Verification pending</strong>
                                    <p>
                                        Your request is being reviewed. You'll
                                        be notified once approved.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ── Security section ── */}
                        <div>
                            <SectionTitle
                                icon={
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
                                }
                            >
                                Security
                            </SectionTitle>
                            <div className="acct-section-cards">
                                {mpinSet === null ? (
                                    <div
                                        className="acct-card"
                                        style={{
                                            padding: "18px",
                                            color: "var(--muted)",
                                            fontSize: "12px",
                                        }}
                                    >
                                        <span
                                            className="acct-spinner"
                                            style={{ marginRight: 8 }}
                                        />
                                        Checking MPIN status…
                                    </div>
                                ) : mpinSet ? (
                                    <ChangeMpinCard toast={showToast} />
                                ) : (
                                    <SetupMpinCard
                                        toast={showToast}
                                        onSuccess={() => {
                                            setMpinSet(true);
                                            dismiss("mpin_setup_prompt");
                                        }}
                                    />
                                )}
                                <ChangePasswordCard
                                    email={profile.email}
                                    toast={showToast}
                                />
                                <BiometricTransactionCard toast={showToast} profile={profile} />
                                <BiometricCard toast={showToast} profile={profile} />
                            </div>
                        </div>

                        {/* ── Organisation tools (org accounts only) ── */}
                        {profile.account_type === "organization" && (
                            <div>
                                <SectionTitle
                                    icon={
                                        <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                        >
                                            <rect
                                                x="3"
                                                y="3"
                                                width="7"
                                                height="7"
                                                rx="1"
                                            />
                                            <rect
                                                x="14"
                                                y="3"
                                                width="7"
                                                height="7"
                                                rx="1"
                                            />
                                            <rect
                                                x="3"
                                                y="14"
                                                width="7"
                                                height="7"
                                                rx="1"
                                            />
                                            <rect
                                                x="14"
                                                y="14"
                                                width="3"
                                                height="3"
                                            />
                                            <rect
                                                x="17"
                                                y="17"
                                                width="3"
                                                height="3"
                                            />
                                        </svg>
                                    }
                                >
                                    Organisation
                                </SectionTitle>
                                <div className="acct-section-cards">
                                    <div className="acct-card acct-card--action">
                                        <div className="acct-action-header acct-action-header--static">
                                            <div className="acct-action-icon acct-action-icon--purple">
                                                <svg
                                                    width="18"
                                                    height="18"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                >
                                                    <rect
                                                        x="3"
                                                        y="3"
                                                        width="7"
                                                        height="7"
                                                        rx="1"
                                                    />
                                                    <rect
                                                        x="14"
                                                        y="3"
                                                        width="7"
                                                        height="7"
                                                        rx="1"
                                                    />
                                                    <rect
                                                        x="3"
                                                        y="14"
                                                        width="7"
                                                        height="7"
                                                        rx="1"
                                                    />
                                                    <rect
                                                        x="14"
                                                        y="14"
                                                        width="3"
                                                        height="3"
                                                    />
                                                    <rect
                                                        x="17"
                                                        y="17"
                                                        width="3"
                                                        height="3"
                                                    />
                                                </svg>
                                            </div>
                                            <div className="acct-action-info">
                                                <span className="acct-action-title">
                                                    POS &amp; API Keys
                                                </span>
                                                <span className="acct-action-sub">
                                                    Connect your store software
                                                    or POS terminal to accept
                                                    payments
                                                </span>
                                            </div>
                                            <button
                                                className="acct-btn acct-btn--primary acct-btn--sm"
                                                onClick={() =>
                                                    navigate("/org/qr-codes")
                                                }
                                            >
                                                Manage →
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Settings section ── */}
                        <div>
                            <SectionTitle
                                icon={
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                    >
                                        <circle cx="12" cy="12" r="3" />
                                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                    </svg>
                                }
                            >
                                Settings
                            </SectionTitle>
                            <div className="acct-section-cards">
                                <div className="acct-card acct-card--action">
                                    <div className="acct-action-header acct-action-header--static">
                                        <div className="acct-action-icon acct-action-icon--purple">
                                            {theme === "light" ? (
                                                <svg
                                                    width="18"
                                                    height="18"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                >
                                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                                                </svg>
                                            ) : (
                                                <svg
                                                    width="18"
                                                    height="18"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                >
                                                    <circle
                                                        cx="12"
                                                        cy="12"
                                                        r="5"
                                                    />
                                                    <line
                                                        x1="12"
                                                        y1="1"
                                                        x2="12"
                                                        y2="3"
                                                    />
                                                    <line
                                                        x1="12"
                                                        y1="21"
                                                        x2="12"
                                                        y2="23"
                                                    />
                                                    <line
                                                        x1="4.22"
                                                        y1="4.22"
                                                        x2="5.64"
                                                        y2="5.64"
                                                    />
                                                    <line
                                                        x1="18.36"
                                                        y1="18.36"
                                                        x2="19.78"
                                                        y2="19.78"
                                                    />
                                                    <line
                                                        x1="1"
                                                        y1="12"
                                                        x2="3"
                                                        y2="12"
                                                    />
                                                    <line
                                                        x1="21"
                                                        y1="12"
                                                        x2="23"
                                                        y2="12"
                                                    />
                                                    <line
                                                        x1="4.22"
                                                        y1="19.78"
                                                        x2="5.64"
                                                        y2="18.36"
                                                    />
                                                    <line
                                                        x1="18.36"
                                                        y1="5.64"
                                                        x2="19.78"
                                                        y2="4.22"
                                                    />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="acct-action-info">
                                            <span className="acct-action-title">
                                                Appearance
                                            </span>
                                            <span className="acct-action-sub">
                                                {theme === "light"
                                                    ? "Currently using light theme"
                                                    : "Currently using dark theme"}
                                            </span>
                                        </div>
                                        <button
                                            className="acct-theme-switch"
                                            onClick={() =>
                                                setTheme((t) =>
                                                    t === "light"
                                                        ? "dark"
                                                        : "light",
                                                )
                                            }
                                            aria-label="Toggle theme"
                                        >
                                            <span
                                                className={`acct-theme-switch__thumb ${theme === "dark" ? "acct-theme-switch__thumb--on" : ""}`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Logout ── */}
                        <button className="acct-logout" onClick={handleLogout}>
                            <svg
                                width="17"
                                height="17"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                            Sign Out
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}