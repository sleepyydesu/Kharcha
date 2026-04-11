import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getTransactions } from "../services/api";
import walletLoadIcon    from "../assets/walletLoadIcon.svg";
import walletSendIcon    from "../assets/walletSendIcon.svg";
import bankIcon          from "../assets/bankIcon.svg";
import transactionIcon   from "../assets/transactionHistoryIcon.svg";
import topupIcon         from "../assets/topupIcon.svg";
import internetIcon      from "../assets/internetIcon.svg";
import landlineIcon      from "../assets/landlineIcon.svg";
import waterIcon         from "../assets/waterIcon.svg";
import electricityIcon   from "../assets/electricityIcon.svg";
import educationIcon     from "../assets/educationIcon.svg";
import giftcardIcon      from "../assets/giftcardIcon.png";
import "./Dashboard.css";

// ─── Service data ─────────────────────────────────────────────────────────────

const MAIN_SERVICES = [
    { label: "Load",            icon: walletLoadIcon,  route: "/load"           },
    { label: "Transfer",        icon: walletSendIcon,  route: "/send"           },
    { label: "Bank\nTransfer",  icon: bankIcon,        route: "/bank-transfer"  },
    { label: "Expenses",        icon: transactionIcon, route: "/expenses"       },
];

const ALL_SERVICES = [
    { label: "Topup",          icon: topupIcon,       route: "/services/topup"       },
    { label: "Internet",       icon: internetIcon,    route: "/services/internet"    },
    { label: "Landline",       icon: landlineIcon,    route: "/services/landline"    },
    { label: "Water",          icon: waterIcon,       route: "/services/water"       },
    { label: "Electricity",    icon: electricityIcon, route: "/services/electricity" },
    { label: "School/College", icon: educationIcon,   route: "/services/education"   },
];

// ─── Transaction helpers (mirrors Statements.jsx) ─────────────────────────────

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
    const cp   = t.counterparty;
    const name = cp?.display_name || "Unknown";
    const isOrg    = cp?.account_type === "organization";
    const isSystem = cp?.account_type === "system";
    if (t.method === "khalti")                        return "Loaded via Khalti";
    if (isSystem)                                     return "Gift Card redeemed";
    if (isOrg && t.type === "sent")                   return `Paid to ${name}`;
    if (isOrg && t.type === "received")               return `Received from ${name}`;
    if (t.type === "sent")                            return `Sent to ${name}`;
    return `Received from ${name}`;
}

function getTxAvatar(t) {
    const cp    = t.counterparty;
    const isOrg    = cp?.account_type === "organization";
    const isSystem = cp?.account_type === "system";
    if (isSystem)                         return giftcardIcon;
    if (isOrg && t.type === "received")   return cp.profile_picture || walletLoadIcon;
    if (isOrg && t.type === "sent")       return cp.profile_picture || walletSendIcon;
    if (t.type === "sent")                return walletSendIcon;
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
                            <img
                                className="db-recent__avatar"
                                src={getTxAvatar(t)}
                                alt=""
                            />
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
                    {MAIN_SERVICES.map(({ label, icon, route }) => (
                        <button key={label} className="db-main__btn" onClick={() => navigate(route)}>
                            <img src={icon} alt={label} className="db-main__icon" />
                            <span className="db-main__label">{label}</span>
                        </button>
                    ))}
                </div>

                {/* Recharge & Payments */}
                <div className="db-services">
                    <h4 className="db-services__heading">Recharge & Payments</h4>
                    <div className="db-services__grid">
                        {ALL_SERVICES.map(({ label, icon, route }) => (
                            <button key={label} className="db-services__item" onClick={() => navigate(route)}>
                                <img src={icon} alt={label} className="db-services__icon" />
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