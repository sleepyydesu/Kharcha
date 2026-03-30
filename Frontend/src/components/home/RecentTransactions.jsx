import React from "react";
import "./RecentTransactions.css";

const transactions = [
  {
    id: 1,
    title: "Sent to Ram",
    amount: -500,
    category: "Transfer",
    date: "Mar 29",
    color: "#E53935",
  },
  {
    id: 2,
    title: "Wallet Load",
    amount: +2000,
    category: "Load",
    date: "Mar 28",
    color: "#43A047",
  },
  {
    id: 3,
    title: "Internet Bill",
    amount: -899,
    category: "Bills",
    date: "Mar 27",
    color: "#FB8C00",
  },
  {
    id: 4,
    title: "Sent to Sita",
    amount: -300,
    category: "Transfer",
    date: "Mar 26",
    color: "#E53935",
  },
  {
    id: 5,
    title: "Salary Received",
    amount: +25000,
    category: "Income",
    date: "Mar 25",
    color: "#43A047",
  },
];

export default function RecentTransactions() {
  return (
    <div className="transactions-container">
      <h3 className="transactions-heading">Recent Transactions</h3>
      {transactions.map((item) => (
        <div key={item.id} className="transaction-row">
          <div
            className="txn-icon"
            style={{ backgroundColor: item.color + "22" }}
          >
            <span style={{ color: item.color }}>
              {item.amount > 0 ? "⬇️" : "⬆️"}
            </span>
          </div>
          <div className="txn-info">
            <p className="txn-title">{item.title}</p>
            <p className="txn-meta">
              {item.category} · {item.date}
            </p>
          </div>
          <span
            className="txn-amount"
            style={{ color: item.amount > 0 ? "#43A047" : "#E53935" }}
          >
            {item.amount > 0 ? "+" : ""}NPR{" "}
            {Math.abs(item.amount).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
