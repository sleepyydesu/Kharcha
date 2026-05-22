import { useState } from "react";
import ServicePage from "./ServicePage";
import { getReceiver } from "./receiverMapping";

export default function Landline() {
  const [phone, setPhone] = useState("");
  const [provider, setProvider] = useState("");

  const fieldsValid = phone.trim().length >= 7 && !!provider;

  const fields = (
    <>
      <div className="sp-field">
        <label className="sp-label">Landline Number</label>
        <input
          className="sp-input"
          type="tel"
          placeholder="01XXXXXXX"
          maxLength={10}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
        />
      </div>
      <div className="sp-field">
        <label className="sp-label">Provider</label>
        <select
          className="sp-select"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
        >
          <option value="">Select provider</option>
          <option>Nepal Telecom</option>
          <option>Smart Telecom</option>
        </select>
      </div>
    </>
  );

  return (
    <ServicePage
      title="Landline Bill"
      accent="#7c3aed"
      amountLabel="Bill Amount"
      presets={[200, 400, 600, 800, 1000]}
      note="Landline bills are settled within 24 hours."
      fields={fields}
      fieldsValid={fieldsValid}
      getRemarks={() => `Landline Bill – ${provider} – ${phone}`}
      receiverIdentifier={() => getReceiver("LANDLINE", provider)}
    />
  );
}
