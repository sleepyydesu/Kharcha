import { useState, useEffect } from "react";
import {
    getMyCard,
    requestCard,
    blockMyCard,
    updateCardLimits,
} from "../services/api";
import KharchaLogo from "../components/KharchaLogo";
import "./KharchaCard.css";

// ─── Status badge ─────────────────────────────────────────────
function StatusBadge({ status }) {
    const map = {
        active: { label: "Active", cls: "badge--success" },
        blocked: { label: "Blocked", cls: "badge--error" },
        pending: { label: "Pending", cls: "badge--warning" },
        approved: { label: "Approved", cls: "badge--warning" },
        issued: { label: "Issued", cls: "badge--warning" },
    };
    const { label, cls } = map[status] || { label: status, cls: "" };
    return <span className={`kc-badge ${cls}`}>{label}</span>;
}

// ─── The visual card ──────────────────────────────────────────
function CardVisual({ status }) {
    const isBlocked = status === "blocked";
    return (
        <div
            className={`kc-card-visual ${isBlocked ? "kc-card-visual--blocked" : ""}`}
        >
            {/* Logo centre */}
            <div className="kc-logo-wrap">
                <KharchaLogo size={52} />
                <span className="kc-card-brand">Kharcha</span>
            </div>

            {/* Chip icon */}
            <div className="kc-chip-icon">
                <svg width="32" height="25" viewBox="0 0 28 22" fill="none">
                    <rect
                        x="0.5"
                        y="0.5"
                        width="27"
                        height="21"
                        rx="3.5"
                        stroke="currentColor"
                        strokeOpacity="0.5"
                    />
                    <line
                        x1="9"
                        y1="1"
                        x2="9"
                        y2="21"
                        stroke="currentColor"
                        strokeOpacity="0.4"
                    />
                    <line
                        x1="19"
                        y1="1"
                        x2="19"
                        y2="21"
                        stroke="currentColor"
                        strokeOpacity="0.4"
                    />
                    <line
                        x1="1"
                        y1="7"
                        x2="27"
                        y2="7"
                        stroke="currentColor"
                        strokeOpacity="0.4"
                    />
                    <line
                        x1="1"
                        y1="15"
                        x2="27"
                        y2="15"
                        stroke="currentColor"
                        strokeOpacity="0.4"
                    />
                </svg>
            </div>

            {/* NFC icon top-right */}
            <div className="kc-nfc-icon">
                <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                >
                    <path d="M8.56 2.9A8 8 0 0 1 20 10" strokeLinecap="round" />
                    <path d="M10.7 6.5A4 4 0 0 1 16 10" strokeLinecap="round" />
                    <circle cx="12" cy="10" r="1" fill="currentColor" />
                    <path d="M7 17l5-7" strokeLinecap="round" />
                    <rect x="4" y="16" width="8" height="6" rx="1" />
                </svg>
            </div>

            {isBlocked && (
                <div className="kc-blocked-overlay">
                    <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                    <span>Card Blocked</span>
                </div>
            )}
        </div>
    );
}

// ─── Block card modal ─────────────────────────────────────────
function BlockModal({ onConfirm, onCancel, loading }) {
    const [reason, setReason] = useState("");
    return (
        <div className="kc-modal-backdrop" onClick={onCancel}>
            <div className="kc-modal" onClick={(e) => e.stopPropagation()}>
                <div className="kc-modal-icon kc-modal-icon--warn">
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                </div>
                <h3 className="kc-modal-title">Block your card?</h3>
                <p className="kc-modal-desc">
                    Your card will be immediately blocked and cannot be used for
                    payments. Contact support to unblock.
                </p>
                <textarea
                    className="kc-textarea"
                    placeholder="Reason (optional)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                />
                <div className="kc-modal-btns">
                    <button
                        className="kc-btn kc-btn--ghost"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        className="kc-btn kc-btn--danger"
                        onClick={() => onConfirm(reason)}
                        disabled={loading}
                    >
                        {loading ? "Blocking…" : "Block Card"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Update limit modal ───────────────────────────────────────
function LimitModal({ currentLimit, onConfirm, onCancel, loading }) {
    const [limit, setLimit] = useState(currentLimit ?? 5000);
    const [err, setErr] = useState("");

    function handleSubmit() {
        const val = Number(limit);
        if (!val || val < 100) {
            setErr("Minimum daily limit is Rs. 100");
            return;
        }
        if (val > 100000) {
            setErr("Maximum daily limit is Rs. 1,00,000");
            return;
        }
        setErr("");
        onConfirm(val);
    }

    return (
        <div className="kc-modal-backdrop" onClick={onCancel}>
            <div className="kc-modal" onClick={(e) => e.stopPropagation()}>
                <div className="kc-modal-icon kc-modal-icon--primary">
                    <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                </div>
                <h3 className="kc-modal-title">Update Daily Limit</h3>
                <p className="kc-modal-desc">
                    Set the maximum amount you can spend per day with your
                    Kharcha Card.
                </p>

                <div className="kc-limit-input-wrap">
                    <span className="kc-limit-prefix">Rs.</span>
                    <input
                        type="number"
                        className="kc-limit-input"
                        value={limit}
                        min={100}
                        max={100000}
                        onChange={(e) => {
                            setLimit(e.target.value);
                            setErr("");
                        }}
                        autoFocus
                    />
                </div>
                {err && <p className="kc-limit-err">{err}</p>}

                <div className="kc-modal-btns">
                    <button
                        className="kc-btn kc-btn--ghost"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        className="kc-btn kc-btn--primary"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? "Saving…" : "Update Limit"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Request card form ────────────────────────────────────────
function RequestCard({ onRequested }) {
    const [address, setAddress] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    async function handleRequest() {
        setLoading(true);
        setError("");
        try {
            await requestCard({ delivery_address: address || undefined });
            setSuccess(true);
            setTimeout(onRequested, 1200);
        } catch (e) {
            setError(e.message || "Failed to submit request.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="kc-request-section">
            <div className="kc-request-hero">
                {/* Placeholder card art */}
                <div className="kc-card-visual">
                    <div className="kc-logo-wrap">
                        <KharchaLogo size={52} />
                        <span className="kc-card-brand">Kharcha</span>
                    </div>
                    <div className="kc-chip-icon">
                        <svg
                            width="32"
                            height="25"
                            viewBox="0 0 28 22"
                            fill="none"
                        >
                            <rect
                                x="0.5"
                                y="0.5"
                                width="27"
                                height="21"
                                rx="3.5"
                                stroke="currentColor"
                                strokeOpacity="0.5"
                            />
                            <line
                                x1="9"
                                y1="1"
                                x2="9"
                                y2="21"
                                stroke="currentColor"
                                strokeOpacity="0.4"
                            />
                            <line
                                x1="19"
                                y1="1"
                                x2="19"
                                y2="21"
                                stroke="currentColor"
                                strokeOpacity="0.4"
                            />
                            <line
                                x1="1"
                                y1="7"
                                x2="27"
                                y2="7"
                                stroke="currentColor"
                                strokeOpacity="0.4"
                            />
                            <line
                                x1="1"
                                y1="15"
                                x2="27"
                                y2="15"
                                stroke="currentColor"
                                strokeOpacity="0.4"
                            />
                        </svg>
                    </div>
                    <div className="kc-nfc-icon">
                        <svg
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                        >
                            <path
                                d="M8.56 2.9A8 8 0 0 1 20 10"
                                strokeLinecap="round"
                            />
                            <path
                                d="M10.7 6.5A4 4 0 0 1 16 10"
                                strokeLinecap="round"
                            />
                            <circle cx="12" cy="10" r="1" fill="currentColor" />
                            <path d="M7 17l5-7" strokeLinecap="round" />
                            <rect x="4" y="16" width="8" height="6" rx="1" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="kc-request-info">
                <h2 className="kc-request-title">Get your Kharcha Card</h2>
                <p className="kc-request-desc">
                    A physical RFID card linked to your Kharcha wallet. Tap to
                    pay at any Kharcha-enabled POS terminal — no phone needed.
                </p>

                <ul className="kc-perks">
                    <li>
                        <span className="kc-perk-dot" />
                        Instant RFID tap-to-pay
                    </li>
                    <li>
                        <span className="kc-perk-dot" />
                        Configurable daily spend limit
                    </li>
                    <li>
                        <span className="kc-perk-dot" />
                        Self-service block anytime
                    </li>
                    <li>
                        <span className="kc-perk-dot" />
                        Delivered to your address
                    </li>
                </ul>

                <div className="kc-address-field">
                    <label className="kc-label" htmlFor="kc-addr">
                        Delivery address{" "}
                        <span className="kc-label-opt">(optional)</span>
                    </label>
                    <input
                        id="kc-addr"
                        className="kc-input"
                        placeholder="e.g. Baneshwor, Kathmandu"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                    />
                </div>

                {error && <p className="kc-error">{error}</p>}
                {success && (
                    <p className="kc-success">
                        Request submitted! We'll notify you soon.
                    </p>
                )}

                <button
                    className="kc-btn kc-btn--primary kc-btn--full"
                    onClick={handleRequest}
                    disabled={loading || success}
                >
                    {loading
                        ? "Submitting…"
                        : success
                          ? "Submitted!"
                          : "Request Card"}
                </button>
            </div>
        </div>
    );
}

// ─── Active / blocked card view ───────────────────────────────
function ActiveCard({ card, onRefresh }) {
    const [showBlock, setShowBlock] = useState(false);
    const [showLimit, setShowLimit] = useState(false);
    const [blockLoading, setBlockLoading] = useState(false);
    const [limitLoading, setLimitLoading] = useState(false);
    const [toast, setToast] = useState(null);

    function showToast(msg, type = "success") {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3200);
    }

    async function handleBlock(reason) {
        setBlockLoading(true);
        try {
            await blockMyCard({ reason });
            setShowBlock(false);
            showToast("Card blocked successfully.");
            onRefresh();
        } catch (e) {
            showToast(e.message || "Failed to block card.", "error");
        } finally {
            setBlockLoading(false);
        }
    }

    async function handleLimitUpdate(daily_limit) {
        setLimitLoading(true);
        try {
            await updateCardLimits({ daily_limit });
            setShowLimit(false);
            showToast("Daily limit updated.");
            onRefresh();
        } catch (e) {
            showToast(e.message || "Failed to update limit.", "error");
        } finally {
            setLimitLoading(false);
        }
    }

    const isBlocked = card.status === "blocked";
    const activatedDate = card.activated_at
        ? new Date(card.activated_at).toLocaleDateString("en-NP", {
              day: "numeric",
              month: "short",
              year: "numeric",
          })
        : "—";

    return (
        <div className="kc-active-section">
            {/* Card visual */}
            <div className="kc-card-center">
                <CardVisual status={card.status} />
            </div>

            {/* Buttons centred below card */}
            {!isBlocked && (
                <div className="kc-card-actions">
                    <button
                        className="kc-btn kc-btn--outline"
                        onClick={() => setShowLimit(true)}
                    >
                        <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                        >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                        Update Limit
                    </button>
                    <button
                        className="kc-btn kc-btn--danger-outline"
                        onClick={() => setShowBlock(true)}
                    >
                        <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                        </svg>
                        Block Card
                    </button>
                </div>
            )}

            {isBlocked && (
                <div className="kc-blocked-notice">
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                    Card is blocked. Contact support to unblock.
                </div>
            )}

            {/* Details */}
            <div className="kc-details-grid">
                <div className="kc-detail-item">
                    <span className="kc-detail-label">Status</span>
                    <StatusBadge status={card.status} />
                </div>
                <div className="kc-detail-item">
                    <span className="kc-detail-label">Daily Limit</span>
                    <span className="kc-detail-value">
                        {card.daily_limit != null
                            ? `Rs. ${Number(card.daily_limit).toLocaleString("en-IN")}`
                            : "—"}
                    </span>
                </div>
                <div className="kc-detail-item">
                    <span className="kc-detail-label">Activated</span>
                    <span className="kc-detail-value">{activatedDate}</span>
                </div>
                <div className="kc-detail-item">
                    <span className="kc-detail-label">Type</span>
                    <span className="kc-detail-value">RFID Physical Card</span>
                </div>
            </div>

            {/* Modals */}
            {showBlock && (
                <BlockModal
                    onConfirm={handleBlock}
                    onCancel={() => setShowBlock(false)}
                    loading={blockLoading}
                />
            )}
            {showLimit && (
                <LimitModal
                    currentLimit={card.daily_limit}
                    onConfirm={handleLimitUpdate}
                    onCancel={() => setShowLimit(false)}
                    loading={limitLoading}
                />
            )}

            {/* Toast */}
            {toast && (
                <div
                    className={`kc-toast ${toast.type === "error" ? "kc-toast--error" : "kc-toast--success"}`}
                >
                    {toast.msg}
                </div>
            )}
        </div>
    );
}

// ─── Pending request view ─────────────────────────────────────
function PendingCard({ request }) {
    const submittedDate = new Date(request.created_at).toLocaleDateString(
        "en-NP",
        {
            day: "numeric",
            month: "short",
            year: "numeric",
        },
    );
    return (
        <div className="kc-pending-section">
            <div className="kc-card-center">
                <div className="kc-card-visual">
                    <div className="kc-logo-wrap">
                        <KharchaLogo size={52} />
                        <span className="kc-card-brand">Kharcha</span>
                    </div>
                    <div className="kc-chip-icon">
                        <svg
                            width="32"
                            height="25"
                            viewBox="0 0 28 22"
                            fill="none"
                        >
                            <rect
                                x="0.5"
                                y="0.5"
                                width="27"
                                height="21"
                                rx="3.5"
                                stroke="currentColor"
                                strokeOpacity="0.5"
                            />
                            <line
                                x1="9"
                                y1="1"
                                x2="9"
                                y2="21"
                                stroke="currentColor"
                                strokeOpacity="0.4"
                            />
                            <line
                                x1="19"
                                y1="1"
                                x2="19"
                                y2="21"
                                stroke="currentColor"
                                strokeOpacity="0.4"
                            />
                            <line
                                x1="1"
                                y1="7"
                                x2="27"
                                y2="7"
                                stroke="currentColor"
                                strokeOpacity="0.4"
                            />
                            <line
                                x1="1"
                                y1="15"
                                x2="27"
                                y2="15"
                                stroke="currentColor"
                                strokeOpacity="0.4"
                            />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="kc-pending-info">
                <StatusBadge status={request.status} />
                <h3 className="kc-pending-title">Card request received</h3>
                <p className="kc-pending-desc">
                    Your request was submitted on{" "}
                    <strong>{submittedDate}</strong>. We'll notify you once it's
                    approved and dispatched.
                </p>

                <div className="kc-steps">
                    <div
                        className={`kc-step ${["pending", "approved", "issued"].includes(request.status) ? "kc-step--done" : ""}`}
                    >
                        <div className="kc-step-dot" />
                        <span>Request submitted</span>
                    </div>
                    <div className="kc-step-line" />
                    <div
                        className={`kc-step ${["approved", "issued"].includes(request.status) ? "kc-step--done" : ""}`}
                    >
                        <div className="kc-step-dot" />
                        <span>Approved by admin</span>
                    </div>
                    <div className="kc-step-line" />
                    <div
                        className={`kc-step ${request.status === "issued" ? "kc-step--done" : ""}`}
                    >
                        <div className="kc-step-dot" />
                        <span>Card issued &amp; activated</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── KharchaCard page ─────────────────────────────────────────
export default function KharchaCard() {
    const [state, setState] = useState({
        loading: true,
        card: null,
        pending: null,
        error: null,
    });

    async function fetchCard() {
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            const data = await getMyCard();
            setState({
                loading: false,
                card: data.card,
                pending: data.pending_request ?? null,
                error: null,
            });
        } catch (e) {
            setState({
                loading: false,
                card: null,
                pending: null,
                error: e.message || "Failed to load.",
            });
        }
    }

    useEffect(() => {
        fetchCard();
    }, []);

    const { loading, card, pending, error } = state;

    return (
        <div className="kc-page">
            <div className="kc-body">
                <div className="kc-header">
                    <h1 className="kc-title">Kharcha Card</h1>
                    <p className="kc-sub">Your physical RFID wallet card</p>
                </div>

                {loading && (
                    <div className="kc-skeleton-wrap">
                        <div className="kc-skeleton kc-skeleton--card" />
                        <div className="kc-skeleton kc-skeleton--text" />
                        <div className="kc-skeleton kc-skeleton--text kc-skeleton--short" />
                    </div>
                )}

                {!loading && error && (
                    <div className="kc-error-box">
                        <p>{error}</p>
                        <button
                            className="kc-btn kc-btn--ghost"
                            onClick={fetchCard}
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* Has a card */}
                {!loading && !error && card && (
                    <ActiveCard card={card} onRefresh={fetchCard} />
                )}

                {/* Has a pending request */}
                {!loading && !error && !card && pending && (
                    <PendingCard request={pending} />
                )}

                {/* No card, no request */}
                {!loading && !error && !card && !pending && (
                    <RequestCard onRequested={fetchCard} />
                )}
            </div>
        </div>
    );
}
