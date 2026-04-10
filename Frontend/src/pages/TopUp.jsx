import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TopUpForm from "../components/topup/TopUpForm";
import "./SendMoney.css";

export default function TopUp({ setTransactions }) {
  const navigate = useNavigate();

  return (
    <div className="page-wrapper">
      {/* HEADER */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate("/")}>
          <ArrowLeft size={22} color="white" />
        </button>
        <h2 className="page-title">Top Up</h2>
        <div />
      </div>

      {/* CONTENT */}
      <div className="page-content">
        <TopUpForm setTransactions={setTransactions} />
      </div>
    </div>
  );
}
