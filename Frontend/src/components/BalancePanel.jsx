import { useEffect, useState, useCallback } from "react";
import { getWallet, getProfile } from "../services/api";
import hiddenIcon from "../assets/hiddenBalanceIcon.svg";
import showIcon   from "../assets/showBalanceIcon.svg";
import "./BalancePanel.css";

export default function BalancePanel() {
  const [name,    setName]    = useState("");
  const [balance, setBalance] = useState(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  /* Load profile name once */
  useEffect(() => {
    getProfile()
      .then(d => setName(d?.profile?.full_name || d?.profile?.name || ""))
      .catch(() => {});
  }, []);

  /* Fetch balance — called on toggle-to-show and on mount for skeleton */
  const fetchBalance = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getWallet();
      setBalance(d?.wallet?.balance ?? 0);
    } catch {
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleToggle() {
    const next = !visible;
    setVisible(next);
    if (next) fetchBalance();   // refresh whenever revealing
  }

  function fmt(n) {
    return new Intl.NumberFormat("ne-NP", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  }

  return (
    <div className="balance-panel">
      {/* Header row */}
      <div className="balance-panel__top">
        <div className="balance-panel__greeting">
          <span className="balance-panel__hello">Hello,</span>
          <span className="balance-panel__name">{name || "—"}</span>
        </div>
        <button
          className="balance-panel__toggle"
          onClick={handleToggle}
          aria-label={visible ? "Hide balance" : "Show balance"}
        >
          <img
            src={visible ? showIcon : hiddenIcon}
            alt={visible ? "hide" : "show"}
            className="balance-panel__toggle-icon"
          />
        </button>
      </div>

      {/* Balance row */}
      <div className="balance-panel__balance">
        <span className="balance-panel__currency">NPR</span>
        {visible ? (
          loading ? (
            <span className="balance-panel__skeleton" />
          ) : balance !== null ? (
            <span className="balance-panel__amount">{fmt(balance)}</span>
          ) : (
            <span className="balance-panel__amount">—</span>
          )
        ) : (
          <span className="balance-panel__amount balance-panel__amount--hidden">••••••</span>
        )}
      </div>
    </div>
  );
}