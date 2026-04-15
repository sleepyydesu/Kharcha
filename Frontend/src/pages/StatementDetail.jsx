import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTransactionById } from "../services/api";
import CategoryIcon from "../components/CategoryIcon";
import giftcardIcon   from "../assets/giftcardIcon.png";
import walletLoadIcon from "../assets/walletLoadIcon.svg";
import walletSendIcon from "../assets/walletSendIcon.svg";
import "./StatementDetail.css";

function detectIconType(url) {
    if (!url) return "png";
    return /\.svg(\?|$)/i.test(url) ? "svg" : "png";
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-NP", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("en-NP", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  });
}

function fmtAmt(amount) {
  return Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

function Avatar({ party, role, size = 52 }) {
  const { account_type, display_name, profile_picture } = party || {};

  // Gift card / system account → gift card logo
  if (account_type === "system") {
    return <img className="txd-avatar txd-avatar--img" src={giftcardIcon} alt="Gift Card" style={{ width: size, height: size }} />;
  }

  // Organisation → their uploaded logo
  if (account_type === "organization" && profile_picture) {
    return <img className="txd-avatar txd-avatar--img" src={profile_picture} alt={display_name} style={{ width: size, height: size }} />;
  }

  // User (or org with no logo) → initials only, no profile picture
  const fallbackIcon = role === "sender" ? walletLoadIcon : walletSendIcon;
  const initials = (display_name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="txd-avatar txd-avatar--initials" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </span>
  );
}

function StatusBadge({ status }) {
  const s = (status || "").toLowerCase();
  return <span className={`txd-status txd-status--${s}`}>{status}</span>;
}

function DetailRow({ label, value, mono }) {
  if (!value && value !== 0) return null;
  return (
    <div className="txd-detail-row">
      <span className="txd-detail-label">{label}</span>
      <span className={`txd-detail-value${mono ? " txd-detail-value--mono" : ""}`}>{value}</span>
    </div>
  );
}

export default function StatementDetail() {
  const { transaction_id } = useParams();
  const navigate = useNavigate();
  const [tx, setTx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getTransactionById(transaction_id)
      .then((res) => setTx(res.transaction))
      .catch((err) => setError(err.message || "Failed to load transaction."))
      .finally(() => setLoading(false));
  }, [transaction_id]);

  return (
    <div className="txd-page">
      <div className="txd-container">

        {/* Back button */}
        <button className="txd-back" onClick={() => navigate(-1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
          </svg>
          Back to Statements
        </button>

        {loading && (
          <div className="txd-skeletons">
            <div className="txd-skeleton txd-skeleton--hero" />
            <div className="txd-skeleton txd-skeleton--card" />
            <div className="txd-skeleton txd-skeleton--card" />
          </div>
        )}

        {error && (
          <div className="txd-error">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {!loading && !error && tx && (
          <>
            {/* ── Hero amount card ── */}
            <div className={`txd-hero txd-hero--${tx.type}`}>
              <div className="txd-hero__top">
                <span className="txd-hero__label">
                  {tx.type === "sent" ? "Amount Sent" : "Amount Received"}
                </span>
                <StatusBadge status={tx.status} />
              </div>
              <div className="txd-hero__amount">
                <span className="txd-hero__sign">{tx.type === "sent" ? "−" : "+"}</span>
                Rs.&nbsp;{fmtAmt(tx.amount)}
              </div>
              <div className="txd-hero__meta">
                {fmtDate(tx.created_at)} &nbsp;·&nbsp; {fmtTime(tx.created_at)}
              </div>
              {tx.balance_after != null && (
                <div className="txd-hero__balance">
                  Balance after: Rs. {fmtAmt(tx.balance_after)}
                </div>
              )}
            </div>

            {/* ── Parties card ── */}
            <div className="txd-card">
              <div className="txd-card__title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Parties
              </div>

              <div className="txd-parties">
                {/* Sender */}
                <div className="txd-party">
                  <Avatar party={tx.sender} role="sender" />
                  <div className="txd-party__info">
                    <span className="txd-party__role">From</span>
                    <span className="txd-party__name">{tx.sender.display_name || "Unknown"}</span>
                    {tx.sender.phone_number && (
                      <span className="txd-party__sub">{tx.sender.phone_number}</span>
                    )}
                    <span className="txd-party__type">{tx.sender.account_type}</span>
                  </div>
                </div>

                <div className="txd-parties__arrow">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                  </svg>
                </div>

                {/* Receiver */}
                <div className="txd-party">
                  <Avatar party={tx.receiver} role="receiver" />
                  <div className="txd-party__info">
                    <span className="txd-party__role">To</span>
                    <span className="txd-party__name">{tx.receiver.display_name || "Unknown"}</span>
                    {tx.receiver.phone_number && (
                      <span className="txd-party__sub">{tx.receiver.phone_number}</span>
                    )}
                    <span className="txd-party__type">{tx.receiver.account_type}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Transaction details card ── */}
            <div className="txd-card">
              <div className="txd-card__title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                  <rect x="9" y="3" width="6" height="4" rx="1"/>
                </svg>
                Transaction Details
              </div>

              <div className="txd-details">
                <DetailRow label="Transaction ID" value={tx.transaction_id} mono />
                <DetailRow label="Method" value={tx.method} />
                {tx.category?.name && (
                  <div className="txd-detail-row">
                    <span className="txd-detail-label">Category</span>
                    <span className="txd-detail-value txd-detail-value--category">
                      <CategoryIcon
                        iconUrl={tx.category.icon}
                        iconType={detectIconType(tx.category.icon)}
                        name={tx.category.name}
                        size={18}
                      />
                      {tx.category.name}
                    </span>
                  </div>
                )}
                <DetailRow label="Remarks" value={tx.remarks} />
                <DetailRow label="Date" value={fmtDate(tx.created_at)} />
                <DetailRow label="Time" value={fmtTime(tx.created_at)} />
                <DetailRow label="Currency" value={tx.currency} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}