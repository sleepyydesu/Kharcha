import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getTransactions } from "../api/transaction"; // ✅ API

import "../components/home/RecentTransactions.css";

export default function Statements() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const data = await getTransactions();
      setTransactions(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load transactions ❌");
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate("/")}>
          <ArrowLeft size={22} color="white" />
        </button>
        <h2 className="page-title">Statements</h2>
        <div />
      </div>

      <div className="page-content">
        <div className="recent-container">
          <h3 className="recent-heading">All Transactions</h3>

          {transactions.length === 0 ? (
            <p>No transactions yet</p>
          ) : (
            transactions.map((txn) => (
              <div key={txn.transaction_id} className="txn-card">
                <div className="txn-details">
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
                <span className={`txn-amount ${txn.type}`}>
                  {txn.type === "sent" ? "-" : "+"} NPR {txn.amount}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
