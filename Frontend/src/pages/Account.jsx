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
} from "../services/api";
import { useNotifications } from "../context/NotificationContext";
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

// ── Setup MPIN card ───────────────────────────────────────────
function SetupMpinCard({ toast, onSuccess }) {
    const [mpin, setMpin] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);

    const handle = async () => {
        if (mpin.length !== 6)
            return toast("MPIN must be exactly 6 digits.", "error");

        if (mpin !== confirm)
            return toast("MPINs do not match.", "error");

        setLoading(true);

        try {
            await setupMpin({ mpin });
            toast("MPIN setup successful.", "success");
            onSuccess?.();
        } catch (err) {
            toast(err.message || "Failed to setup MPIN.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="acct-card acct-card--action">
            <div className="acct-action-header acct-action-header--static">
                <div className="acct-action-icon acct-action-icon--green">
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path d="M12 1v22" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                </div>

                <div className="acct-action-info">
                    <span className="acct-action-title">Setup MPIN</span>
                    <span className="acct-action-sub">
                        Create your 6-digit transaction PIN
                    </span>
                </div>
            </div>

            <div className="acct-action-body">
                <PinInput
                    label="New MPIN"
                    value={mpin}
                    onChange={setMpin}
                />

                <PinInput
                    label="Confirm MPIN"
                    value={confirm}
                    onChange={setConfirm}
                />

                <div className="acct-action-btns">
                    <button
                        className="acct-btn acct-btn--primary"
                        onClick={handle}
                        disabled={
                            loading ||
                            mpin.length < 6 ||
                            confirm.length < 6
                        }
                    >
                        {loading ? <span className="acct-spinner" /> : null}
                        {loading ? "Saving…" : "Setup MPIN"}
                    </button>
                </div>
            </div>
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

        if (next !== confirm)
            return toast("MPINs do not match.", "error");

        setLoad(true);

        try {
            await changeMpin({
                current_mpin: cur,
                new_mpin: next,
            });

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
                    className={`acct-chevron ${
                        open ? "acct-chevron--open" : ""
                    }`}
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
                                loading ||
                                !cur ||
                                next.length < 6 ||
                                !confirm
                            }
                        >
                            {loading ? (
                                <span className="acct-spinner" />
                            ) : null}

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