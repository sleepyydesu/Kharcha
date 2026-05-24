import { useState } from "react";
import ServicePage from "./ServicePage";
import { getReceiver } from "./receiverMapping";

export default function Topup() {
  const [phone, setPhone] = useState("");
  const [operator, setOperator] = useState("");

  const fieldsValid = phone.trim().length >= 9 && !!operator;

  const fields = (
    <>
      <div className="sp-field">
        <label className="sp-label">Mobile Number</label>
        <input
          className="sp-input"
          type="tel"
          placeholder="98XXXXXXXX"
          maxLength={10}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
        />
      </div>
      <div className="sp-field">
        <label className="sp-label">Operator</label>
        <select
          className="sp-select"
          value={operator}
          onChange={(e) => setOperator(e.target.value)}
        >
          <option value="">Select operator</option>
          <option>Ncell</option>
          <option>NTC</option>
        </select>
      </div>
    </>
  );

  return (
    <ServicePage
      title="Mobile Topup"
      accent="#1a5c39"
      amountLabel="Topup Amount"
      presets={[50, 100, 200, 500, 1000]}
      note="Recharge is applied instantly to the mobile number."
      fields={fields}
      fieldsValid={fieldsValid}
      getRemarks={() => `Mobile Topup – ${operator} – ${phone}`}
      receiverIdentifier={() => getReceiver("TOPUP", operator)}
    />
  );
}
