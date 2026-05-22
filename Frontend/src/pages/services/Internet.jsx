import { useState } from "react";
import ServicePage from "./ServicePage";
import { getReceiver } from "./receiverMapping";

export default function Internet() {
  const [username, setUsername] = useState("");
  const [provider, setProvider] = useState("");

  const fieldsValid = username.trim().length > 0 && !!provider;

  const fields = (
    <>
      <div className="sp-field">
        <label className="sp-label">Username / Customer ID</label>
        <input
          className="sp-input"
          type="text"
          placeholder="Enter your ISP username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div className="sp-field">
        <label className="sp-label">Internet Provider</label>
        <select
          className="sp-select"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
        >
          <option value="">Select provider</option>
          <option>WorldLink</option>
          <option>Vianet</option>
          <option>Subisu</option>
          <option>Classic Tech</option>
          <option>Dish Home</option>
          <option>CG Net</option>
        </select>
      </div>
    </>
  );

  return (
    <ServicePage
      title="Internet Bill"
      accent="#1a56db"
      amountLabel="Bill Amount"
      presets={[500, 800, 1000, 1500, 2000]}
      note="Payment is processed within a few minutes."
      fields={fields}
      fieldsValid={fieldsValid}
      getRemarks={() => `Internet Bill – ${provider} – ${username}`}
      receiverIdentifier={() => getReceiver("INTERNET", provider)}
    />
  );
}
