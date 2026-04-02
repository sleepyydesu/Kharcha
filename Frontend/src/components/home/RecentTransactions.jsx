import React from "react";
import { ArrowLeftRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./RecentTransactions.css";

/* ================= DUMMY DATA (5 ITEMS) ================= */
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
    balance: 9000.4,
    amount: 1500.0,
    type: "debit",
  },
  {
    id: 3,
    title: "Electricity Bill",
    time: "10:15 AM",
    balance: 7500.0,
    amount: 500.0,
    type: "debit",
  },
  {
    id: 4,
    title: "Salary Received",
    time: "8:00 AM",
    balance: 12000.0,
    amount: 5000.0,
    type: "credit",
  },
  {
    id: 5,
    title: "Water Bill",
    time: "Yesterday",
    balance: 7000.0,
    amount: 800.0,
    type: "debit",
  },
];

export default function RecentTransactions() {
  const navigate = useNavigate();

  return (
    <div className="recent-container">
      <h3 className="recent-heading">Recent Transactions</h3>

      {transactions.map((txn) => (
        <div
          key={txn.id}
          className="txn-card"
          onClick={() => navigate(`/transaction/${txn.id}`)}
        >
          {/* ICON */}
          <div className="txn-icon-box">
            <ArrowLeftRight size={16} strokeWidth={1.5} />
          </div>

          {/* DETAILS */}
          <div className="txn-details">
            <p className="txn-title">{txn.title}</p>
            <p className="txn-time">{txn.time}</p>
            <p className="txn-balance">Balance NPR {txn.balance.toFixed(2)}</p>
          </div>

          {/* AMOUNT */}
          <span
            className={`txn-amount ${
              txn.type === "credit" ? "positive" : "negative"
            }`}
          >
            {txn.type === "credit" ? "+" : "-"} NPR {txn.amount.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}
