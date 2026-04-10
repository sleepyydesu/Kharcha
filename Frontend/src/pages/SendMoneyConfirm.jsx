import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { sendMoney } from "../api/wallet";
import "./SendMoneyConfirm.css";

export default function SendMoneyConfirm() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const [mpin, setMpin] = useState("");

  if (!state) return <p>No data found</p>;

  const { receiver, amount, note } = state;

  const handleConfirm = async () => {
    if (!mpin) {
      alert("Enter MPIN");
      return;
    }

    try {
      await sendMoney({
        receiver_identifier: receiver,
        amount: Number(amount),
        mpin: mpin,
        remarks: note,
        category_id: 1,
      });

      alert("Transaction Successful ✅");

      navigate("/");
    } catch (err) {
      console.log(err.response?.data);

      alert(err?.response?.data?.message || "Transaction Failed ❌");
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} color="white" />
        </button>
        <h2 className="page-title">Confirm Transfer</h2>
        <div />
      </div>

      <div className="page-content">
        <div className="confirm-card">
          <h3>Confirm Details</h3>

          <p>
            <strong>To:</strong> {receiver}
          </p>
          <p>
            <strong>Amount:</strong> NPR {amount}
          </p>
          <p>
            <strong>Note:</strong> {note || "None"}
          </p>

          {/* 🔥 MPIN FIELD */}
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
            Confirm & Send
          </button>
        </div>
      </div>
    </div>
  );
}
