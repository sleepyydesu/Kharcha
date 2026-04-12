import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { createPaymentSession, getPaymentSessionStatus } from "../services/api";
import "./DynamicQRPayment.css";

// ─── Icons ────────────────────────────────────────────────────
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
function CheckCircle() {
    return (
        <svg
            width="56"
            height="56"
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
function ClockIcon() {
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
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}
function RefreshIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
        >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
    );
}

// ─── Countdown timer ──────────────────────────────────────────
function Countdown({ expiresAt }) {
    const [remaining, setRemaining] = useState(0);

    useEffect(() => {
        function tick() {
            const ms = new Date(expiresAt).getTime() - Date.now();
            setRemaining(Math.max(0, Math.floor(ms / 1000)));
        }
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [expiresAt]);

    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    const urgent = remaining < 60;

    return (
        <span
            className={`dqr__countdown${urgent ? " dqr__countdown--urgent" : ""}`}
        >
            <ClockIcon />
            {m}:{String(s).padStart(2, "0")}
        </span>
    );
}

// ─── QR canvas ────────────────────────────────────────────────
function QRCanvas({ payload, size = 220 }) {
    const canvasRef = useRef(null);
    useEffect(() => {
        if (!canvasRef.current || !payload) return;
        QRCode.toCanvas(canvasRef.current, payload, {
            width: size,
            margin: 2,
            color: { dark: "#111111", light: "#ffffff" },
        });
    }, [payload, size]);
    return (
        <canvas
            ref={canvasRef}
            className="dqr__canvas"
            width={size}
            height={size}
        />
    );
}

// ─── Main Page ────────────────────────────────────────────────
export default function DynamicQRPayment() {
    const navigate = useNavigate();

    // ── Form state ────────────────────────────────────────────
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");

    // ── Session state ─────────────────────────────────────────
    const [session, setSession] = useState(null); // { session_id, qr_payload, expires_at, amount }
    const [status, setStatus] = useState("pending"); // "pending" | "success" | "expired"
    const pollRef = useRef(null);

    // ── Polling ───────────────────────────────────────────────
    const stopPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    const startPolling = useCallback(
        (session_id) => {
            stopPolling();
            pollRef.current = setInterval(async () => {
                try {
                    const data = await getPaymentSessionStatus(session_id);
                    if (data.status !== "pending") {
                        setStatus(data.status);
                        stopPolling();
                    }
                } catch {
                    // Network hiccup — keep polling
                }
            }, 2500);
        },
        [stopPolling],
    );

    // Stop polling when the component unmounts
    useEffect(() => () => stopPolling(), [stopPolling]);

    // ── Create session ────────────────────────────────────────
    async function handleCreate(e) {
        e.preventDefault();
        const parsed = parseFloat(amount);
        if (!parsed || parsed <= 0) {
            setError("Enter a valid amount.");
            return;
        }
        setCreating(true);
        setError("");
        try {
            const data = await createPaymentSession({
                amount: parsed,
                note: note.trim() || undefined,
            });
            const expiresAt = new Date(
                Date.now() + 5 * 60 * 1000,
            ).toISOString();
            const newSession = {
                session_id: data.session_id,
                qr_payload: data.qr_payload,
                expires_at: expiresAt,
                amount: parsed,
            };
            setSession(newSession);
            setStatus("pending");
            startPolling(data.session_id);
        } catch (err) {
            setError(err.message || "Failed to create QR. Try again.");
        } finally {
            setCreating(false);
        }
    }

    // ── New payment ───────────────────────────────────────────
    function handleReset() {
        stopPolling();
        setSession(null);
        setStatus("pending");
        setAmount("");
        setNote("");
        setError("");
    }

    // ── Expired: auto-reset after 3 s ─────────────────────────
    useEffect(() => {
        if (status === "expired") {
            const t = setTimeout(handleReset, 3000);
            return () => clearTimeout(t);
        }
    }, [status]);

    // ─────────────────────────────────────────────────────────
    //  RENDER
    // ─────────────────────────────────────────────────────────

    return (
        <div className="dqr">
            <button className="dqr__back" onClick={() => navigate(-1)}>
                <BackArrow /> Back
            </button>

            <div className="dqr__header">
                <h1 className="dqr__heading">Dynamic QR Payment</h1>
                <p className="dqr__sub">
                    Enter an amount, show the QR to your customer, and this page
                    automatically confirms when payment arrives.
                </p>
            </div>

            {/* ── No session yet: amount form ── */}
            {!session && (
                <form className="dqr__form" onSubmit={handleCreate}>
                    <div className="dqr__field">
                        <label className="dqr__label">
                            Amount (NPR) <span className="dqr__req">*</span>
                        </label>
                        <div className="dqr__amount-wrap">
                            <span className="dqr__currency">Rs.</span>
                            <input
                                className="dqr__amount-input"
                                type="number"
                                min="1"
                                step="0.01"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    setError("");
                                }}
                                autoFocus
                                required
                            />
                        </div>
                    </div>

                    <div className="dqr__field">
                        <label className="dqr__label">
                            Remarks{" "}
                            <span className="dqr__optional">(optional)</span>
                        </label>
                        <input
                            className="dqr__input"
                            type="text"
                            placeholder="e.g. Table 4, Order #21"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            maxLength={120}
                        />
                    </div>

                    {error && <p className="dqr__error">{error}</p>}

                    <button
                        className="dqr__btn dqr__btn--primary"
                        type="submit"
                        disabled={creating || !amount}
                    >
                        {creating ? "Generating QR…" : "Generate QR Code"}
                    </button>
                </form>
            )}

            {/* ── Active session ── */}
            {session && status === "pending" && (
                <div className="dqr__session">
                    <div className="dqr__session-top">
                        <div className="dqr__amount-badge">
                            Rs.{" "}
                            {Number(session.amount).toLocaleString("en-NP", {
                                minimumFractionDigits: 2,
                            })}
                        </div>
                        <Countdown expiresAt={session.expires_at} />
                    </div>

                    <div className="dqr__qr-wrap">
                        <QRCanvas payload={session.qr_payload} size={220} />
                        <div className="dqr__scanning-ring" />
                    </div>

                    <p className="dqr__hint">
                        {note ? (
                            <>
                                <strong>{note}</strong> ·{" "}
                            </>
                        ) : null}
                        Ask your customer to scan this code in their Kharcha
                        app.
                    </p>

                    <div className="dqr__pulse-row">
                        <span className="dqr__pulse-dot" />
                        <span className="dqr__pulse-label">
                            Waiting for payment…
                        </span>
                    </div>

                    <button
                        className="dqr__btn dqr__btn--ghost"
                        onClick={handleReset}
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* ── Payment received ── */}
            {session && status === "success" && (
                <div className="dqr__result dqr__result--success">
                    <div className="dqr__result-icon dqr__result-icon--success">
                        <CheckCircle />
                    </div>
                    <h2 className="dqr__result-title">Payment Received!</h2>
                    <p className="dqr__result-amount">
                        Rs.{" "}
                        {Number(session.amount).toLocaleString("en-NP", {
                            minimumFractionDigits: 2,
                        })}
                    </p>
                    {note && <p className="dqr__result-note">{note}</p>}
                    <button
                        className="dqr__btn dqr__btn--primary"
                        onClick={handleReset}
                    >
                        <RefreshIcon /> New Payment
                    </button>
                </div>
            )}

            {/* ── Expired ── */}
            {session && status === "expired" && (
                <div className="dqr__result dqr__result--expired">
                    <p className="dqr__result-title">QR Expired</p>
                    <p className="dqr__result-note">Generating a new one…</p>
                </div>
            )}
        </div>
    );
}
