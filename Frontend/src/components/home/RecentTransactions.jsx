import React from "react";
import { ArrowLeftRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./RecentTransactions.css";

const transactions = [
  {
    id: 1,
    title: "Fund Transferred to User",
    time: "9:30 PM",
    balance: 10000.4,
    amount: 1000.0,
    type: "credit",
  },
  {
    id: 2,
    title: "Fund Transfer",
    time: "9:36 AM",
    balance: 2000.4,
    amount: 1500.0,
    type: "debit",
  },
  {
    id: 3,
    title: "Fund Transfer",
    time: "9:50 AM",
    balance: 3000.0,
    amount: 500.0,
    type: "debit",
  },
];

export default function RecentTransactions() {
  const navigate = useNavigate();

  return (
    <div className="recent-container">
      <h3 className="recent-heading">Recent Transaction</h3>
      {transactions.map((txn) => (
        <div
          key={txn.id}
          className="txn-card"
          onClick={() => navigate(`/transaction/${txn.id}`)}
        >
          <div className="txn-icon-box">
            <ArrowLeftRight size={16} color="#555" strokeWidth={1.5} />
          </div>
          <div className="txn-details">
            <p className="txn-title">{txn.title}</p>
            <p className="txn-time">{txn.time}</p>
            <p className="txn-balance">Balance {txn.balance}</p>
          </div>
          <span
            className={`txn-amount ${txn.type === "credit" ? "positive" : "negative"}`}
          >
            {txn.amount.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}
