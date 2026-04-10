import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SendMoneyForm from "../components/sendmoney/SendMoneyForm";
import "./SendMoney.css";

export default function SendMoney() {
  const navigate = useNavigate();

  return (
    <div className="page-wrapper">
      {/* HEADER */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate("/")}>
          <ArrowLeft size={22} color="white" />
        </button>
        <h2 className="page-title">Send Money</h2>
        <div />
      </div>

      {/* CONTENT */}
      <div className="page-content">
        <SendMoneyForm />
      </div>
    </div>
  );
}
