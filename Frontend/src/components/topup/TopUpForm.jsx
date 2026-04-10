import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./TopUpForm.css";
import { initiateKhalti } from "../../api/khalti";

const operators = [
  { id: "ncell", label: "Ncell" },
  { id: "ntc", label: "NTC" },
  { id: "smartcell", label: "Smart Cell" },
];

export default function TopUpForm() {
  const navigate = useNavigate();

  const [mobile, setMobile] = useState("");
  const [amount, setAmount] = useState("");
  const [operator, setOperator] = useState("ncell");

  const handleSubmit = async () => {
    if (!mobile || !amount) {
      alert("Please fill all required fields");
      return;
    }

    try {
      const res = await initiateKhalti(Number(amount));

      // 🔥 redirect user to Khalti payment page
      window.location.href = res.payment_url;
    } catch (err) {
      console.error(err);
      alert("Topup failed ❌");
    }
  };

  return (
    <div className="form-card">
      <h3 className="form-heading">Mobile Top Up</h3>

      {/* OPERATOR */}
      <div className="form-group">
        <label className="form-label">Select Operator</label>
        <div className="method-list">
          {operators.map((op) => (
            <button
              key={op.id}
              type="button"
              className={`method-btn ${
                operator === op.id ? "method-active" : ""
              }`}
              onClick={() => setOperator(op.id)}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>

      {/* MOBILE */}
      <div className="form-group">
        <label className="form-label">Mobile Number</label>
        <input
          type="text"
          className="form-input"
          placeholder="Enter mobile number"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
        />
      </div>

      {/* AMOUNT */}
      <div className="form-group">
        <label className="form-label">Amount (NPR)</label>
        <input
          type="number"
          className="form-input"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      {/* BUTTON */}
      <button className="submit-btn" onClick={handleSubmit}>
        Top Up Now
      </button>
    </div>
  );
}
