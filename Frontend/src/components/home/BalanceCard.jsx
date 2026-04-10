import React, { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { getBalance } from "../../api/wallet";
import "./BalanceCard.css";

export default function BalanceCard() {
  const [showBalance, setShowBalance] = useState(true);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const data = await getBalance();
        setBalance(data.balance); // backend: res.data.wallet.balance
      } catch (err) {
        console.error("Balance fetch error:", err);
      }
    };

    fetchBalance();
  }, []);

  return (
    <div className="balance-card">
      <div className="balance-top">
        <p>Available Balance</p>

        <button
          className="eye-btn"
          onClick={() => setShowBalance(!showBalance)}
        >
          {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      </div>

      <h2 className="balance-amount">
        {showBalance ? `NPR ${balance}` : "••••••"}
      </h2>
    </div>
  );
}
