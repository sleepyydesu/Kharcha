import React, { useState } from "react";
import { Eye, EyeOff, Wallet } from "lucide-react";
import "./BalanceCard.css";

export default function BalanceCard() {
  const [visible, setVisible] = useState(false);

  return (
    <div className="balance-card">
      <div className="balance-card-top">
        <Wallet size={15} color="#666" strokeWidth={1.5} />
        <span className="card-number">XXXX XXXX XXXXX</span>
      </div>
      <p className="balance-account-type">XXXXXXXXX</p>
      <div className="balance-row">
        <span className="balance-amount">
          {visible ? "NPR 10000.00" : "xxxxXXX.XX"}
        </span>
        <button className="eye-btn" onClick={() => setVisible(!visible)}>
          {visible ? (
            <EyeOff size={20} color="#555" />
          ) : (
            <Eye size={20} color="#555" />
          )}
        </button>
      </div>
    </div>
  );
}
