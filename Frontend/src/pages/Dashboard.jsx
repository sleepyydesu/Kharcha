import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getTransactions } from "../services/api";

// SVGs imported as raw strings via Vite's built-in ?raw suffix.
// This lets us render them as real inline SVG so CSS currentColor
// applies to strokes — no CSS mask, no external fetch, no data-URI issues.
import walletLoadIconRaw  from "../assets/walletLoadIcon.svg?raw";
import walletSendIconRaw  from "../assets/walletSendIcon.svg?raw";
import bankIconRaw        from "../assets/bankIcon.svg?raw";
import transactionIconRaw from "../assets/transactionHistoryIcon.svg?raw";
import topupIconRaw       from "../assets/topupIcon.svg?raw";
import internetIconRaw    from "../assets/internetIcon.svg?raw";
import landlineIconRaw    from "../assets/landlineIcon.svg?raw";
import waterIconRaw       from "../assets/waterIcon.svg?raw";
import electricityIconRaw from "../assets/electricityIcon.svg?raw";
import educationIconRaw   from "../assets/educationIcon.svg?raw";

// URL imports — still needed for getTxAvatar (dynamic, from API response)
import walletLoadIcon  from "../assets/walletLoadIcon.svg";
import walletSendIcon  from "../assets/walletSendIcon.svg";

import giftcardIcon from "../assets/giftcardIcon.png";   // PNG — stays as <img>
import "./Dashboard.css";

// ─── toCurrentColor ───────────────────────────────────────────────────────────
// Strips hardcoded hex stroke/fill values from a raw SVG string and replaces
// them with currentColor, so the icon inherits CSS `color` from its container.
// Also makes the SVG scale to 100%/100% instead of a fixed 800px size.

function toCurrentColor(raw) {
    return raw
        // Strip embedded <style> blocks (e.g. older SVGs with class-based fills)
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        // Replace explicit stroke / fill attributes (keep fill="none")
        .replace(/stroke="[^"]*"/g, 'stroke="currentColor"')
        .replace(/fill="(?!none)[^"]*"/g, 'fill="currentColor"')
        // Remove inline style="" attributes
        .replace(/style="[^"]*"/g, '')
        // Force responsive sizing
        .replace(/width="[^"]*"/, 'width="100%"')
        .replace(/height="[^"]*"/, 'height="100%"');
}

// ─── DashIcon ─────────────────────────────────────────────────────────────────
// Renders an inline SVG icon. Container gets color: var(--category-icon-color)
// from CSS, which flows into every currentColor stroke/fill inside the SVG.

function DashIcon({ raw, alt, className }) {
    return (
        <span
            className={`db-icon-wrap ${className ?? ""}`}
            role="img"
            aria-label={alt}
            dangerouslySetInnerHTML={{ __html: toCurrentColor(raw) }}
        />
    );
}

// ─── TxAvatar ─────────────────────────────────────────────────────────────────
// Maps URL imports back to their raw strings for inline rendering.
// Profile pictures and PNGs from the API fall through to a plain <img>.

const URL_TO_RAW = new Map([
    [walletLoadIcon, walletLoadIconRaw],
    [walletSendIcon, walletSendIconRaw],
]);

function TxAvatar({ urlSrc }) {
    const raw = URL_TO_RAW.get(urlSrc);
    if (raw) {
        return (
            <span
                className="db-recent__avatar db-recent__avatar--svg db-icon-wrap"
                role="img"
                dangerouslySetInnerHTML={{ __html: toCurrentColor(raw) }}
            />
        );
    }
    return <img className="db-recent__avatar" src={urlSrc} alt="" />;
}

// ─── Service data ─────────────────────────────────────────────────────────────

const MAIN_SERVICES = [
    { label: "Load",           raw: walletLoadIconRaw,  route: "/load"          },
    { label: "Transfer",       raw: walletSendIconRaw,  route: "/send"          },
    { label: "Bank\nTransfer", raw: bankIconRaw,        route: "/bank-transfer" },
    { label: "Expenses",       raw: transactionIconRaw, route: "/expenses"      },
];

const ALL_SERVICES = [
    { label: "Topup",          raw: topupIconRaw,       route: "/services/topup"       },
    { label: "Internet",       raw: internetIconRaw,    route: "/services/internet"    },
    { label: "Landline",       raw: landlineIconRaw,    route: "/services/landline"    },
    { label: "Water",          raw: waterIconRaw,       route: "/services/water"       },
    { label: "Electricity",    raw: electricityIconRaw, route: "/services/electricity" },
    { label: "School/College", raw: educationIconRaw,   route: "/services/education"   },
];

// ─── Transaction helpers ──────────────────────────────────────────────────────

function fmtAmt(amount, type) {
    const abs = Number(amount).toLocaleString("en-IN", {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
    return (type === "sent" ? "− " : "+ ") + "Rs. " + abs;
}

function fmtRelative(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  <  1) return "Just now";
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days  <  7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString("en-NP", { day: "numeric", month: "short" });
}

function getTxLabel(t) {
    const cp       = t.counterparty;
    const name     = cp?.display_name || "Unknown";
    const isOrg    = cp?.account_type === "organization";
    const isSystem = cp?.account_type === "system";
    if (t.method === "khalti")              return "Loaded via Khalti";
    if (isSystem)                           return "Gift Card redeemed";
    if (isOrg && t.type === "sent")         return `Paid to ${name}`;
    if (isOrg && t.type === "received")     return `Received from ${name}`;
    if (t.type === "sent")                  return `Sent to ${name}`;
    return `Received from ${name}`;
}

function getTxAvatar(t) {
    const cp       = t.counterparty;
    const isOrg    = cp?.account_type === "organization";
    const isSystem = cp?.account_type === "system";
    if (isSystem)                       return giftcardIcon;
    if (isOrg && t.type === "received") return cp.profile_picture || walletLoadIcon;
    if (isOrg && t.type === "sent")     return cp.profile_picture || walletSendIcon;
    if (t.type === "sent")              return walletSendIcon;
    return walletLoadIcon;
}

// ─── Recent Transactions ──────────────────────────────────────────────────────

function RecentTransactions() {
    const navigate = useNavigate();
    const [txns,    setTxns]    = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);

    useEffect(() => {
        getTransactions({ page: 1, limit: 5 })
            .then(r => setTxns(r.statements?.slice(0, 5) || []))
            .catch(e => setError(e.message || "Failed to load."))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="db-recent">
            <div className="db-recent__header">
                <h4 className="db-recent__heading">Recent Transactions</h4>
                <button className="db-recent__see-all" onClick={() => navigate("/statements")}>
                    See all
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="m9 18 6-6-6-6" />
                    </svg>
                </button>
            </div>

            {loading && (
                <div className="db-recent__skeletons">
                    {[0,1,2,3,4].map(i => (
                        <div key={i} className="db-recent__skeleton"
                            style={{ animationDelay: `${i * 70}ms` }} />
                    ))}
                </div>
            )}

            {error && !loading && (
                <p className="db-recent__error">{error}</p>
            )}

            {!loading && !error && txns.length === 0 && (
                <div className="db-recent__empty">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.3">
                        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                        <rect x="9" y="3" width="6" height="4" rx="1"/>
                        <line x1="9" y1="12" x2="15" y2="12"/>
                        <line x1="9" y1="16" x2="12" y2="16"/>
                    </svg>
                    <p>No transactions yet</p>
                </div>
            )}

            {!loading && !error && txns.length > 0 && (
                <div className="db-recent__list">
                    {txns.map(t => (
                        <div
                            key={t.transaction_id}
                            className="db-recent__row"
                            onClick={() => navigate(`/statements/${t.transaction_id}`)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={e => e.key === "Enter" && navigate(`/statements/${t.transaction_id}`)}
                        >
                            <TxAvatar urlSrc={getTxAvatar(t)} />
                            <div className="db-recent__info">
                                <span className="db-recent__label">{getTxLabel(t)}</span>
                                <span className="db-recent__meta">
                                    {t.category && <span className="db-recent__tag">{t.category}</span>}
                                    <span className="db-recent__time">{fmtRelative(t.created_at)}</span>
                                </span>
                            </div>
                            <span className={`db-recent__amount ${t.type === "sent" ? "out" : "in"}`}>
                                {fmtAmt(t.amount, t.type)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
    const navigate = useNavigate();

    return (
        <div className="dashboard">
            <div className="dashboard__body">
                <h1 className="dashboard__title">Dashboard</h1>
                <p className="dashboard__sub">Welcome back. Here's your overview.</p>

                {/* Main Services */}
                <div className="db-main">
                    {MAIN_SERVICES.map(({ label, raw, route }) => (
                        <button key={label} className="db-main__btn" onClick={() => navigate(route)}>
                            <DashIcon raw={raw} alt={label} className="db-main__icon" />
                            <span className="db-main__label">{label}</span>
                        </button>
                    ))}
                </div>

                {/* Recharge & Payments */}
                <div className="db-services">
                    <h4 className="db-services__heading">Recharge & Payments</h4>
                    <div className="db-services__grid">
                        {ALL_SERVICES.map(({ label, raw, route }) => (
                            <button key={label} className="db-services__item" onClick={() => navigate(route)}>
                                <DashIcon raw={raw} alt={label} className="db-services__icon" />
                                <span className="db-services__label">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Recent Transactions */}
                <RecentTransactions />
            </div>
        </div>
    );
}