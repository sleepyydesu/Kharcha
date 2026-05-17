import { useState } from "react";
import ServicePage from "./ServicePage";

export default function Water() {
  const [customerId, setCustomerId] = useState("");
  const [office, setOffice] = useState("");

  const fieldsValid = customerId.trim().length > 0 && !!office;

  const fields = (
    <>
      <div className="sp-field">
        <label className="sp-label">Customer ID</label>
        <input
          className="sp-input"
          type="text"
          placeholder="Enter customer ID"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        />
      </div>
      <div className="sp-field">
        <label className="sp-label">Water Supply Office</label>
        <select
          className="sp-select"
          value={office}
          onChange={(e) => setOffice(e.target.value)}
        >
          <option value="">Select office</option>
          <option>KUKL</option>
          <option>NWSC Kathmandu</option>
          <option>NWSC Pokhara</option>
          <option>Municipality Water</option>
        </select>
      </div>
    </>
  );

  return (
    <ServicePage
      title="Water Bill"
      accent="#0369a1"
      amountLabel="Bill Amount"
      presets={[100, 200, 400, 600, 1000]}
      note="Water bill payment is reflected within 24–48 hours."
      fields={fields}
      fieldsValid={fieldsValid}
      getRemarks={() => `Water Bill – ${office} – ${customerId}`}
    />
  );
}
