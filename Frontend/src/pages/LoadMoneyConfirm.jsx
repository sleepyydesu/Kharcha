import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { initiateKhalti } from "../api/khalti";
import "./SendMoneyConfirm.css";

export default function LoadMoneyConfirm() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const [mpin, setMpin] = useState("");

  if (!state) return <p>No data found</p>;

  const { amount, method } = state;

  const handleConfirm = async () => {
    if (!mpin) {
      alert("Enter MPIN");
      return;
    }

    try {
      // ⚠️ MPIN not required by backend — just UI validation
      // You can later validate MPIN via API if needed

      if (method !== "khalti") {
        alert("Only Khalti supported right now ⚠️");
        return;
      }

      const res = await initiateKhalti(Number(amount));

      alert("Redirecting to payment...");

      // 🔥 Redirect to Khalti
      window.location.href = res.payment_url;
    } catch (err) {
      console.error(err.response?.data);

      alert(err?.response?.data?.message || "Topup failed ❌");
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} color="white" />
        </button>
        <h2 className="page-title">Confirm Load</h2>
        <div />
      </div>

      <div className="page-content">
        <div className="confirm-card">
          <h3>Confirm Load Details</h3>

          <p>
            <strong>Amount:</strong> NPR {amount}
          </p>
          <p>
            <strong>Method:</strong> {method}
          </p>

          {/* 🔥 MPIN INPUT */}
          <div className="form-group" style={{ marginTop: "15px" }}>
            <label>Enter MPIN</label>
            <input
              type="password"
              className="form-input"
              placeholder="6-digit MPIN"
              value={mpin}
              onChange={(e) => setMpin(e.target.value)}
            />
          </div>

          <button className="confirm-btn" onClick={handleConfirm}>
            Confirm & Load
          </button>
        </div>
      </div>
    </div>
  );
}
