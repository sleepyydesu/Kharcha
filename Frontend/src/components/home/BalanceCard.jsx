import React, { useState } from "react";
import { Eye, EyeOff, Wallet } from "lucide-react";
import "./BalanceCard.css";

export default function BalanceCard() {
  const [visible, setVisible] = useState(false);

  const balance = 10000.0;

  return (
    <div className="balance-card">
      {/* TOP */}
      <div className="balance-card-top">
        <Wallet size={16} strokeWidth={1.5} />
        <span className="card-number">XXXX XXXX XXXX</span>
      </div>

      {/* ACCOUNT TYPE */}
      <p className="balance-account-type">Savings Account</p>

      {/* BALANCE */}
      <div className="balance-row">
        <span className="balance-amount">
          {visible ? `NPR ${balance.toFixed(2)}` : "NPR XXXX.XX"}
        </span>

        <button className="eye-btn" onClick={() => setVisible(!visible)}>
          {visible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  );
}
