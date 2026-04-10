import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SendMoneyForm.css";

export default function SendMoneyForm() {
  const navigate = useNavigate();

  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const handleSubmit = () => {
    if (!receiver || !amount) {
      alert("Please fill in all required fields");
      return;
    }

    // ✅ go to confirm screen
    navigate("/send/confirm", {
      state: { receiver, amount, note },
    });
  };

  return (
    <div className="form-card">
      <h3 className="form-heading">Send Money</h3>

      <div className="form-group">
        <label className="form-label">Receiver Mobile</label>
        <input
          type="text"
          className="form-input"
          placeholder="+97798XXXXXXXX"
          value={receiver}
          onChange={(e) => setReceiver(e.target.value)}
        />
      </div>

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

      <div className="form-group">
        <label className="form-label">Note (Optional)</label>
        <input
          type="text"
          className="form-input"
          placeholder="Add a note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <button className="submit-btn" onClick={handleSubmit}>
        Continue
      </button>
    </div>
  );
}
