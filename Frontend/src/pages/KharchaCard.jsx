import { useState, useEffect } from "react";
import {
    getMyCards,
    issueVirtualCard,
    requestPhysicalCard,
    blockCard,
    updateCardLimits,
} from "../services/api";
import KharchaLogo from "../components/KharchaLogo";
import "./KharchaCard.css";

// ─────────────────────────────────────────────────────────────
//  Shared helpers
// ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
    const map = {
        active:  { label: "Active",  cls: "badge--success" },
        blocked: { label: "Blocked", cls: "badge--error"   },
        pending: { label: "Pending", cls: "badge--warning" },
        approved:{ label: "Approved",cls: "badge--warning" },
        issued:  { label: "Issued",  cls: "badge--warning" },
    };
    const { label, cls } = map[status] || { label: status, cls: "" };
    return <span className={`kc-badge ${cls}`}>{label}</span>;
}

/** Format 16-digit card number as XXXX XXXX XXXX XXXX */
function fmtCardNumber(num) {
    return num ? num.replace(/(.{4})/g, "$1 ").trim() : "";
}

/** Format YYYY-MM-DD → MM/YY */
function fmtExpiry(dateStr) {
    if (!dateStr) return "";
    const [y, m] = dateStr.split("-");
    return `${m}/${y.slice(2)}`;
}

// ─────────────────────────────────────────────────────────────
//  Tab bar
// ─────────────────────────────────────────────────────────────
function TabBar({ active, onChange }) {
    return (
        <div className="kc-tabbar">
            <button
                className={`kc-tab ${active === "virtual" ? "kc-tab--active" : ""}`}
                onClick={() => onChange("virtual")}
            >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                Virtual Card
            </button>
            <button
                className={`kc-tab ${active === "physical" ? "kc-tab--active" : ""}`}
                onClick={() => onChange("physical")}
            >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8.56 2.9A8 8 0 0 1 20 10" strokeLinecap="round" />
                    <path d="M10.7 6.5A4 4 0 0 1 16 10" strokeLinecap="round" />
                    <circle cx="12" cy="10" r="1" fill="currentColor" />
                    <path d="M7 17l5-7" strokeLinecap="round" />
                    <rect x="4" y="16" width="8" height="6" rx="1" />
                </svg>
                Physical Card
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
//  Shared modals
// ─────────────────────────────────────────────────────────────
function BlockModal({ cardType, onConfirm, onCancel, loading }) {
    const [reason, setReason] = useState("");
    return (
        <div className="kc-modal-backdrop" onClick={onCancel}>
            <div className="kc-modal" onClick={(e) => e.stopPropagation()}>
                <div className="kc-modal-icon kc-modal-icon--warn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                </div>
                <h3 className="kc-modal-title">
                    Block your {cardType === "virtual" ? "virtual" : "physical"} card?
                </h3>
                <p className="kc-modal-desc">
                    Your {cardType === "virtual" ? "virtual" : "physical"} card will be immediately blocked.
                    Contact support to unblock it.
                </p>
                <textarea
                    className="kc-textarea"
                    placeholder="Reason (optional)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                />
                <div className="kc-modal-btns">
                    <button className="kc-btn kc-btn--ghost" onClick={onCancel} disabled={loading}>Cancel</button>
                    <button className="kc-btn kc-btn--danger" onClick={() => onConfirm(reason)} disabled={loading}>
                        {loading ? "Blocking…" : "Block Card"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function LimitModal({ currentLimit, onConfirm, onCancel, loading }) {
    const [limit, setLimit] = useState(currentLimit ?? 5000);
    const [err, setErr] = useState("");

    function handleSubmit() {
        const val = Number(limit);
        if (!val || val < 100)    { setErr("Minimum is Rs. 100"); return; }
        if (val > 100000)          { setErr("Maximum is Rs. 1,00,000"); return; }
        setErr("");
        onConfirm(val);
    }

    return (
        <div className="kc-modal-backdrop" onClick={onCancel}>
            <div className="kc-modal" onClick={(e) => e.stopPropagation()}>
                <div className="kc-modal-icon kc-modal-icon--primary">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                </div>
                <h3 className="kc-modal-title">Update Daily Limit</h3>
                <p className="kc-modal-desc">Set the maximum you can spend per day with this card.</p>
                <div className="kc-limit-input-wrap">
                    <span className="kc-limit-prefix">Rs.</span>
                    <input
                        type="number" className="kc-limit-input" value={limit}
                        min={100} max={100000} autoFocus
                        onChange={(e) => { setLimit(e.target.value); setErr(""); }}
                    />
                </div>
                {err && <p className="kc-limit-err">{err}</p>}
                <div className="kc-modal-btns">
                    <button className="kc-btn kc-btn--ghost" onClick={onCancel} disabled={loading}>Cancel</button>
                    <button className="kc-btn kc-btn--primary" onClick={handleSubmit} disabled={loading}>
                        {loading ? "Saving…" : "Update Limit"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
//  VIRTUAL CARD PANEL
// ─────────────────────────────────────────────────────────────

/** Credit-card visual with number, expiry — CVV always hidden (sent via email) */
function VirtualCardVisual({ card }) {
    const isBlocked = card.status === "blocked";
    return (
        <div className={`kc-card-visual kc-card-visual--virtual ${isBlocked ? "kc-card-visual--blocked" : ""}`}>
            {/* top row */}
            <div className="kc-cv-top">
                <div className="kc-logo-wrap kc-logo-wrap--sm">
                    <KharchaLogo size={28} />
                    <span className="kc-card-brand kc-card-brand--sm">Kharcha</span>
                </div>
                <span className="kc-cv-label">VIRTUAL</span>
            </div>

            {/* card number */}
            <div className="kc-cv-number">{fmtCardNumber(card.card_number)}</div>

            {/* bottom row */}
            <div className="kc-cv-bottom">
                <div className="kc-cv-field">
                    <span className="kc-cv-field-label">VALID THRU</span>
                    <span className="kc-cv-field-value">{fmtExpiry(card.expiry_date)}</span>
                </div>
                <div className="kc-cv-field">
                    <span className="kc-cv-field-label">CVV</span>
                    <span className="kc-cv-field-value kc-cv-cvv">•••</span>
                </div>
                <div className="kc-cv-network">
                    <span className="kc-cv-network-text">CREDIT</span>
                </div>
            </div>

            {isBlocked && (
                <div className="kc-blocked-overlay">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                    <span>Card Blocked</span>
                </div>
            )}
        </div>
    );
}

function VirtualCardActive({ card, onRefresh }) {
    const [showBlock, setShowBlock]   = useState(false);
    const [showLimit, setShowLimit]   = useState(false);
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
            await blockCard("virtual", { reason });
            setShowBlock(false);
            showToast("Virtual card blocked.");
            onRefresh();
        } catch (e) {
            showToast(e.message || "Failed to block card.", "error");
        } finally { setBlockLoading(false); }
    }

    async function handleLimitUpdate(daily_limit) {
        setLimitLoading(true);
        try {
            await updateCardLimits("virtual", { daily_limit });
            setShowLimit(false);
            showToast("Daily limit updated.");
            onRefresh();
        } catch (e) {
            showToast(e.message || "Failed to update limit.", "error");
        } finally { setLimitLoading(false); }
    }

    const isBlocked = card.status === "blocked";

    return (
        <div className="kc-active-section">
            <div className="kc-card-center">
                <VirtualCardVisual card={card} />
            </div>

            {/* CVV info notice */}
            {!isBlocked && (
                <div className="kc-cvv-row">
                    <span className="kc-cvv-notice">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        Your CVV was sent to your registered email when the card was issued.
                    </span>
                </div>
            )}

            {/* Action buttons */}
            {!isBlocked && (
                <div className="kc-card-actions">
                    <button className="kc-btn kc-btn--outline" onClick={() => setShowLimit(true)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                        Update Limit
                    </button>
                    <button className="kc-btn kc-btn--danger-outline" onClick={() => setShowBlock(true)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                        </svg>
                        Block Card
                    </button>
                </div>
            )}

            {isBlocked && (
                <div className="kc-blocked-notice">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                    Virtual card is blocked. Contact support to unblock.
                </div>
            )}

            {/* Details grid */}
            <div className="kc-details-grid">
                <div className="kc-detail-item">
                    <span className="kc-detail-label">Status</span>
                    <StatusBadge status={card.status} />
                </div>
                <div className="kc-detail-item">
                    <span className="kc-detail-label">Daily Limit</span>
                    <span className="kc-detail-value">
                        {card.daily_limit != null ? `Rs. ${Number(card.daily_limit).toLocaleString("en-IN")}` : "—"}
                    </span>
                </div>
                <div className="kc-detail-item">
                    <span className="kc-detail-label">Expires</span>
                    <span className="kc-detail-value">{fmtExpiry(card.expiry_date)}</span>
                </div>
                <div className="kc-detail-item">
                    <span className="kc-detail-label">Type</span>
                    <span className="kc-detail-value">Virtual Credit Card</span>
                </div>
            </div>

            {showBlock && <BlockModal cardType="virtual" onConfirm={handleBlock} onCancel={() => setShowBlock(false)} loading={blockLoading} />}
            {showLimit && <LimitModal currentLimit={card.daily_limit} onConfirm={handleLimitUpdate} onCancel={() => setShowLimit(false)} loading={limitLoading} />}
            {toast && <div className={`kc-toast ${toast.type === "error" ? "kc-toast--error" : "kc-toast--success"}`}>{toast.msg}</div>}
        </div>
    );
}

function VirtualCardIssue({ onIssued }) {
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState("");
    const [success, setSuccess] = useState(false);

    async function handleIssue() {
        setLoading(true);
        setError("");
        try {
            await issueVirtualCard();
            setSuccess(true);
            setTimeout(onIssued, 900);
        } catch (e) {
            setError(e.message || "Failed to issue card.");
        } finally { setLoading(false); }
    }

    return (
        <div className="kc-request-section">
            <div className="kc-card-center">
                {/* Preview card */}
                <div className="kc-card-visual kc-card-visual--virtual kc-card-visual--preview">
                    <div className="kc-cv-top">
                        <div className="kc-logo-wrap kc-logo-wrap--sm">
                            <KharchaLogo size={28} />
                            <span className="kc-card-brand kc-card-brand--sm">Kharcha</span>
                        </div>
                        <span className="kc-cv-label">VIRTUAL</span>
                    </div>
                    <div className="kc-cv-number kc-cv-number--placeholder">7333 •••• •••• ••••</div>
                    <div className="kc-cv-bottom">
                        <div className="kc-cv-field">
                            <span className="kc-cv-field-label">VALID THRU</span>
                            <span className="kc-cv-field-value">MM/YY</span>
                        </div>
                        <div className="kc-cv-field">
                            <span className="kc-cv-field-label">CVV</span>
                            <span className="kc-cv-field-value">•••</span>
                        </div>
                        <div className="kc-cv-network"><span className="kc-cv-network-text">CREDIT</span></div>
                    </div>
                </div>
            </div>

            <div className="kc-request-info">
                <h2 className="kc-request-title">Get your Virtual Card</h2>
                <p className="kc-request-desc">
                    A digital credit card instantly linked to your Kharcha wallet.
                    Use it for online payments, subscriptions, and anywhere cards are accepted.
                </p>
                <ul className="kc-perks">
                    <li><span className="kc-perk-dot" /> Instant — ready in seconds</li>
                    <li><span className="kc-perk-dot" /> 16-digit Luhn-verified card number</li>
                    <li><span className="kc-perk-dot" /> CVV delivered securely to your email (never shown in-app)</li>
                    <li><span className="kc-perk-dot" /> Configurable daily spend limit</li>
                    <li><span className="kc-perk-dot" /> Self-service block anytime</li>
                </ul>

                {error   && <p className="kc-error">{error}</p>}
                {success && <p className="kc-success">Virtual card issued! Loading your card…</p>}

                <button
                    className="kc-btn kc-btn--primary kc-btn--full"
                    onClick={handleIssue}
                    disabled={loading || success}
                >
                    {loading ? "Issuing…" : success ? "Issued!" : "Issue Virtual Card"}
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
//  PHYSICAL CARD PANEL
// ─────────────────────────────────────────────────────────────

function PhysicalCardVisual({ card }) {
    const isBlocked = card?.status === "blocked";
    return (
        <div className={`kc-card-visual ${isBlocked ? "kc-card-visual--blocked" : ""}`}>
            <div className="kc-logo-wrap">
                <KharchaLogo size={52} />
                <span className="kc-card-brand">Kharcha</span>
            </div>

            {/* Chip */}
            <div className="kc-chip-icon">
                <svg width="32" height="25" viewBox="0 0 28 22" fill="none">
                    <rect x="0.5" y="0.5" width="27" height="21" rx="3.5" stroke="currentColor" strokeOpacity="0.5" />
                    <line x1="9"  y1="1"  x2="9"  y2="21" stroke="currentColor" strokeOpacity="0.4" />
                    <line x1="19" y1="1"  x2="19" y2="21" stroke="currentColor" strokeOpacity="0.4" />
                    <line x1="1"  y1="7"  x2="27" y2="7"  stroke="currentColor" strokeOpacity="0.4" />
                    <line x1="1"  y1="15" x2="27" y2="15" stroke="currentColor" strokeOpacity="0.4" />
                </svg>
            </div>

            {/* NFC / RFID icon */}
            <div className="kc-nfc-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M8.56 2.9A8 8 0 0 1 20 10" strokeLinecap="round" />
                    <path d="M10.7 6.5A4 4 0 0 1 16 10" strokeLinecap="round" />
                    <circle cx="12" cy="10" r="1" fill="currentColor" />
                    <path d="M7 17l5-7" strokeLinecap="round" />
                    <rect x="4" y="16" width="8" height="6" rx="1" />
                </svg>
            </div>

            {/* Card number on the physical card */}
            {card?.card_number && (
                <div className="kc-phys-number">{fmtCardNumber(card.card_number)}</div>
            )}

            {isBlocked && (
                <div className="kc-blocked-overlay">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                    <span>Card Blocked</span>
                </div>
            )}
        </div>
    );
}

function PhysicalCardActive({ card, onRefresh }) {
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
            await blockCard("physical", { reason });
            setShowBlock(false);
            showToast("Physical card blocked.");
            onRefresh();
        } catch (e) {
            showToast(e.message || "Failed to block card.", "error");
        } finally { setBlockLoading(false); }
    }

    async function handleLimitUpdate(daily_limit) {
        setLimitLoading(true);
        try {
            await updateCardLimits("physical", { daily_limit });
            setShowLimit(false);
            showToast("Daily limit updated.");
            onRefresh();
        } catch (e) {
            showToast(e.message || "Failed to update limit.", "error");
        } finally { setLimitLoading(false); }
    }

    const isBlocked = card.status === "blocked";
    const activatedDate = card.activated_at
        ? new Date(card.activated_at).toLocaleDateString("en-NP", { day: "numeric", month: "short", year: "numeric" })
        : "—";

    return (
        <div className="kc-active-section">
            <div className="kc-card-center">
                <PhysicalCardVisual card={card} />
            </div>

            {!isBlocked && (
                <div className="kc-card-actions">
                    <button className="kc-btn kc-btn--outline" onClick={() => setShowLimit(true)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                        Update Limit
                    </button>
                    <button className="kc-btn kc-btn--danger-outline" onClick={() => setShowBlock(true)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                        </svg>
                        Block Card
                    </button>
                </div>
            )}

            {isBlocked && (
                <div className="kc-blocked-notice">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                    Physical card is blocked. Contact support to unblock.
                </div>
            )}

            <div className="kc-details-grid">
                <div className="kc-detail-item">
                    <span className="kc-detail-label">Status</span>
                    <StatusBadge status={card.status} />
                </div>
                <div className="kc-detail-item">
                    <span className="kc-detail-label">Daily Limit</span>
                    <span className="kc-detail-value">
                        {card.daily_limit != null ? `Rs. ${Number(card.daily_limit).toLocaleString("en-IN")}` : "—"}
                    </span>
                </div>
                <div className="kc-detail-item">
                    <span className="kc-detail-label">Activated</span>
                    <span className="kc-detail-value">{activatedDate}</span>
                </div>
                <div className="kc-detail-item">
                    <span className="kc-detail-label">RFID</span>
                    <span className="kc-detail-value kc-detail-value--mono">
                        {card.rfid_uid || "—"}
                    </span>
                </div>
                <div className="kc-detail-item">
                    <span className="kc-detail-label">Expires</span>
                    <span className="kc-detail-value">{fmtExpiry(card.expiry_date)}</span>
                </div>
                <div className="kc-detail-item">
                    <span className="kc-detail-label">Type</span>
                    <span className="kc-detail-value">Physical + RFID</span>
                </div>
            </div>

            {showBlock && <BlockModal cardType="physical" onConfirm={handleBlock} onCancel={() => setShowBlock(false)} loading={blockLoading} />}
            {showLimit && <LimitModal currentLimit={card.daily_limit} onConfirm={handleLimitUpdate} onCancel={() => setShowLimit(false)} loading={limitLoading} />}
            {toast && <div className={`kc-toast ${toast.type === "error" ? "kc-toast--error" : "kc-toast--success"}`}>{toast.msg}</div>}
        </div>
    );
}

function PhysicalCardPending({ request }) {
    const submittedDate = new Date(request.created_at).toLocaleDateString("en-NP", {
        day: "numeric", month: "short", year: "numeric",
    });
    return (
        <div className="kc-pending-section">
            <div className="kc-card-center">
                <div className="kc-card-visual">
                    <div className="kc-logo-wrap"><KharchaLogo size={52} /><span className="kc-card-brand">Kharcha</span></div>
                    <div className="kc-chip-icon">
                        <svg width="32" height="25" viewBox="0 0 28 22" fill="none">
                            <rect x="0.5" y="0.5" width="27" height="21" rx="3.5" stroke="currentColor" strokeOpacity="0.5" />
                            <line x1="9" y1="1" x2="9" y2="21" stroke="currentColor" strokeOpacity="0.4" />
                            <line x1="19" y1="1" x2="19" y2="21" stroke="currentColor" strokeOpacity="0.4" />
                            <line x1="1" y1="7" x2="27" y2="7" stroke="currentColor" strokeOpacity="0.4" />
                            <line x1="1" y1="15" x2="27" y2="15" stroke="currentColor" strokeOpacity="0.4" />
                        </svg>
                    </div>
                </div>
            </div>
            <div className="kc-pending-info">
                <StatusBadge status={request.status} />
                <h3 className="kc-pending-title">Card request received</h3>
                <p className="kc-pending-desc">
                    Submitted on <strong>{submittedDate}</strong>. We'll notify you once approved and dispatched.
                </p>
                <div className="kc-steps">
                    <div className={`kc-step ${["pending","approved","issued"].includes(request.status) ? "kc-step--done" : ""}`}>
                        <div className="kc-step-dot" /><span>Request submitted</span>
                    </div>
                    <div className="kc-step-line" />
                    <div className={`kc-step ${["approved","issued"].includes(request.status) ? "kc-step--done" : ""}`}>
                        <div className="kc-step-dot" /><span>Approved by admin</span>
                    </div>
                    <div className="kc-step-line" />
                    <div className={`kc-step ${request.status === "issued" ? "kc-step--done" : ""}`}>
                        <div className="kc-step-dot" /><span>Card issued &amp; activated</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PhysicalCardRequest({ onRequested }) {
    const [address, setAddress] = useState("");
    const [pin, setPin]         = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState("");
    const [success, setSuccess] = useState(false);

    async function handleRequest() {
        if (!/^\d{6}$/.test(pin)) {
            setError("Card PIN must be exactly 6 digits.");
            return;
        }
        if (pin !== confirmPin) {
            setError("Card PINs do not match.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            await requestPhysicalCard({
                delivery_address: address || undefined,
                pin,
            });
            setSuccess(true);
            setTimeout(onRequested, 1200);
        } catch (e) {
            setError(e.message || "Failed to submit request.");
        } finally { setLoading(false); }
    }

    return (
        <div className="kc-request-section">
            <div className="kc-card-center">
                <div className="kc-card-visual">
                    <div className="kc-logo-wrap"><KharchaLogo size={52} /><span className="kc-card-brand">Kharcha</span></div>
                    <div className="kc-chip-icon">
                        <svg width="32" height="25" viewBox="0 0 28 22" fill="none">
                            <rect x="0.5" y="0.5" width="27" height="21" rx="3.5" stroke="currentColor" strokeOpacity="0.5" />
                            <line x1="9" y1="1" x2="9" y2="21" stroke="currentColor" strokeOpacity="0.4" />
                            <line x1="19" y1="1" x2="19" y2="21" stroke="currentColor" strokeOpacity="0.4" />
                            <line x1="1" y1="7" x2="27" y2="7" stroke="currentColor" strokeOpacity="0.4" />
                            <line x1="1" y1="15" x2="27" y2="15" stroke="currentColor" strokeOpacity="0.4" />
                        </svg>
                    </div>
                    <div className="kc-nfc-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M8.56 2.9A8 8 0 0 1 20 10" strokeLinecap="round" />
                            <path d="M10.7 6.5A4 4 0 0 1 16 10" strokeLinecap="round" />
                            <circle cx="12" cy="10" r="1" fill="currentColor" />
                            <path d="M7 17l5-7" strokeLinecap="round" />
                            <rect x="4" y="16" width="8" height="6" rx="1" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="kc-request-info">
                <h2 className="kc-request-title">Get your Physical Card</h2>
                <p className="kc-request-desc">
                    A physical card with both credit card capabilities and RFID tap-to-pay
                    at any Kharcha-enabled POS terminal — no phone needed.
                </p>
                <ul className="kc-perks">
                    <li><span className="kc-perk-dot" /> RFID tap-to-pay at POS terminals</li>
                    <li><span className="kc-perk-dot" /> Full credit card: number, expiry — CVV via email</li>
                    <li><span className="kc-perk-dot" /> Configurable daily spend limit</li>
                    <li><span className="kc-perk-dot" /> Self-service block anytime</li>
                    <li><span className="kc-perk-dot" /> Delivered to your address</li>
                </ul>

                <div className="kc-address-field">
                    <label className="kc-label" htmlFor="kc-addr">
                        Delivery address <span className="kc-label-opt">(optional)</span>
                    </label>
                    <input
                        id="kc-addr" className="kc-input"
                        placeholder="e.g. Baneshwor, Kathmandu"
                        value={address} onChange={(e) => setAddress(e.target.value)}
                    />
                </div>

                <div className="kc-pin-grid">
                    <div className="kc-address-field">
                        <label className="kc-label" htmlFor="kc-card-pin">6-digit card PIN</label>
                        <input
                            id="kc-card-pin"
                            className="kc-input"
                            type="password"
                            inputMode="numeric"
                            autoComplete="new-password"
                            maxLength={6}
                            placeholder="••••••"
                            value={pin}
                            onChange={(e) => {
                                setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                                setError("");
                            }}
                        />
                    </div>
                    <div className="kc-address-field">
                        <label className="kc-label" htmlFor="kc-card-pin-confirm">Confirm PIN</label>
                        <input
                            id="kc-card-pin-confirm"
                            className="kc-input"
                            type="password"
                            inputMode="numeric"
                            autoComplete="new-password"
                            maxLength={6}
                            placeholder="••••••"
                            value={confirmPin}
                            onChange={(e) => {
                                setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                                setError("");
                            }}
                        />
                    </div>
                </div>
                <p className="kc-pin-help">
                    This PIN belongs only to your physical card. It can be different from your account MPIN.
                </p>

                {error   && <p className="kc-error">{error}</p>}
                {success && <p className="kc-success">Request submitted! We'll notify you soon.</p>}

                <button
                    className="kc-btn kc-btn--primary kc-btn--full"
                    onClick={handleRequest}
                    disabled={loading || success || pin.length !== 6 || confirmPin.length !== 6}
                >
                    {loading ? "Submitting…" : success ? "Submitted!" : "Request Physical Card"}
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
//  Root page
// ─────────────────────────────────────────────────────────────
export default function KharchaCard() {
    const [tab, setTab] = useState("virtual");
    const [state, setState] = useState({
        loading: true,
        virtual: null,
        physical: null,
        physicalRequest: null,
        error: null,
    });

    async function fetchCards() {
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            const data = await getMyCards();
            setState({
                loading: false,
                virtual:  data.virtual  || null,
                physical: data.physical || null,
                physicalRequest: data.physical_request || null,
                error: null,
            });
        } catch (e) {
            setState({ loading: false, virtual: null, physical: null, physicalRequest: null, error: e.message || "Failed to load." });
        }
    }

    useEffect(() => { fetchCards(); }, []);

    const { loading, virtual, physical, physicalRequest, error } = state;

    return (
        <div className="kc-page">
            <div className="kc-body">
                <div className="kc-header">
                    <h1 className="kc-title">Kharcha Card</h1>
                    <p className="kc-sub">Manage your virtual and physical cards</p>
                </div>

                <TabBar active={tab} onChange={setTab} />

                {/* ── Loading ── */}
                {loading && (
                    <div className="kc-skeleton-wrap">
                        <div className="kc-skeleton kc-skeleton--card" />
                        <div className="kc-skeleton kc-skeleton--text" />
                        <div className="kc-skeleton kc-skeleton--text kc-skeleton--short" />
                    </div>
                )}

                {/* ── Error ── */}
                {!loading && error && (
                    <div className="kc-error-box">
                        <p>{error}</p>
                        <button className="kc-btn kc-btn--ghost" onClick={fetchCards}>Try again</button>
                    </div>
                )}

                {/* ── Virtual tab ── */}
                {!loading && !error && tab === "virtual" && (
                    <>
                        {virtual
                            ? <VirtualCardActive card={virtual} onRefresh={fetchCards} />
                            : <VirtualCardIssue onIssued={fetchCards} />
                        }
                    </>
                )}

                {/* ── Physical tab ── */}
                {!loading && !error && tab === "physical" && (
                    <>
                        {physical
                            ? <PhysicalCardActive card={physical} onRefresh={fetchCards} />
                            : physicalRequest
                                ? <PhysicalCardPending request={physicalRequest} />
                                : <PhysicalCardRequest onRequested={fetchCards} />
                        }
                    </>
                )}
            </div>
        </div>
    );
}
