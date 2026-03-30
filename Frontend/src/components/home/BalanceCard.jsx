import React, { useState } from "react";
import "./BalanceCard.css";

export default function BalanceCard() {
  const [visible, setVisible] = useState(false);
  const balance = "NPR 12,500.00";
  const masked = "xxxxXXX.XX";

  return (
    <div className="balance-card">
      <div className="card-header">
        <span className="wallet-icon">👜</span>
        <span className="card-title">XXXX XXXX XXXXX</span>
      </div>
      <p className="card-subtitle">XXXXXXXXX</p>
      <div className="balance-row">
        <span className="balance-amount">{visible ? balance : masked}</span>
        <button className="eye-btn" onClick={() => setVisible(!visible)}>
          {visible ? "🙈" : "👁️"}
        </button>
      </div>
    </div>
  );
}
