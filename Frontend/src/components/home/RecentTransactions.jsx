import React from "react";
import "./RecentTransactions.css";

export default function RecentTransactions({ transactions = [] }) {
  const recent = transactions.slice(0, 5);

  return (
    <div className="recent-box">
      <h3>Recent Transactions</h3>

      {recent.length === 0 ? (
        <p>No transactions yet</p>
      ) : (
        recent.map((txn) => (
          <div key={txn.transaction_id} className="txn-item">
            <div>
              {/* ✅ NAME */}
              <p className="txn-title">
                {txn.counterparty?.display_name || "Unknown"}
              </p>

              {/* ✅ TIME */}
              <p className="txn-time">
                {new Date(txn.created_at).toLocaleString()}
              </p>
            </div>

            {/* ✅ AMOUNT */}
            <span className={txn.type}>
              {txn.type === "sent" ? "-" : "+"} NPR {txn.amount}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
