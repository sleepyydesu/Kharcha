import { useState } from "react";
import ServicePage from "./ServicePage";

export default function Electricity() {
  const [scNo, setScNo] = useState("");
  const [office, setOffice] = useState("");

  const fieldsValid = scNo.trim().length > 0 && !!office;

  const fields = (
    <>
      <div className="sp-field">
        <label className="sp-label">SC Number</label>
        <input
          className="sp-input"
          type="text"
          placeholder="Enter your SC number"
          value={scNo}
          onChange={(e) => setScNo(e.target.value)}
        />
      </div>
      <div className="sp-field">
        <label className="sp-label">NEA Office</label>
        <select
          className="sp-select"
          value={office}
          onChange={(e) => setOffice(e.target.value)}
        >
          <option value="">Select NEA office</option>
          <option>Kathmandu</option>
          <option>Lalitpur</option>
          <option>Bhaktapur</option>
          <option>Pokhara</option>
          <option>Chitwan</option>
          <option>Biratnagar</option>
          <option>Butwal</option>
        </select>
      </div>
    </>
  );

  return (
    <ServicePage
      title="Electricity Bill"
      accent="#b45309"
      amountLabel="Bill Amount"
      presets={[500, 1000, 2000, 3000, 5000]}
      note="Electricity payment is confirmed instantly with NEA."
      fields={fields}
      fieldsValid={fieldsValid}
      getRemarks={() => `Electricity Bill – NEA ${office} – SC ${scNo}`}
    />
  );
}
