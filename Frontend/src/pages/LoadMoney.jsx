import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LoadMoneyForm from "../components/loadmoney/LoadMoneyForm";
import "./SendMoney.css";

export default function LoadMoney() {
  const navigate = useNavigate();

  return (
    <div className="page-wrapper">
      {/* HEADER */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate("/")}>
          <ArrowLeft size={22} color="white" />
        </button>
        <h2 className="page-title">Load Money</h2>
        <div />
      </div>

      {/* CONTENT */}
      <div className="page-content">
        <LoadMoneyForm />
      </div>
    </div>
  );
}
