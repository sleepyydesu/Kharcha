import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoadMoneyForm.css";

const paymentMethods = [
  { id: "khalti", label: "Khalti" },
  { id: "esewa", label: "eSewa" },
  { id: "bank", label: "Bank Transfer" },
];

export default function LoadMoneyForm() {
  const navigate = useNavigate();

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("khalti");

  const handleSubmit = () => {
    if (!amount) {
      alert("Please enter amount");
      return;
    }

    navigate("/load/confirm", {
      state: { amount, method },
    });
  };

  return (
    <div className="form-card">
      <h3 className="form-heading">Load Money</h3>

      <div className="form-group">
        <label className="form-label">Amount (NPR)</label>
        <input
          type="number"
          className="form-input"
          placeholder="Min NPR 10 - Max NPR 100000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Payment Method</label>
        <div className="method-list">
          {paymentMethods.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`method-btn ${method === m.id ? "method-active" : ""}`}
              onClick={() => setMethod(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <button className="submit-btn" onClick={handleSubmit}>
        Continue
      </button>
    </div>
  );
}
