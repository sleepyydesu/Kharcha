import { useState } from "react";
import ServicePage from "./ServicePage";
import { getReceiver } from "./receiverMapping";

export default function Education() {
  const [studentId, setStudentId] = useState("");
  const [institution, setInstitution] = useState("");
  const [feeType, setFeeType] = useState("");

  const fieldsValid =
    studentId.trim().length > 0 && institution.trim().length > 0 && !!feeType;

  const fields = (
    <>
      <div className="sp-field">
        <label className="sp-label">School / College Name</label>
        <select
          className="sp-select"
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
        >
          <option value="">Select institution</option>
          <option>Herald College Kathmandu</option>
          <option>Islington College</option>
          <option>Kavya College</option>
          <option>Apex College</option>
        </select>
      </div>
      <div className="sp-field">
        <label className="sp-label">Student ID / Roll No.</label>
        <input
          className="sp-input"
          type="text"
          placeholder="Enter student ID or roll number"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        />
      </div>
      <div className="sp-field">
        <label className="sp-label">Fee Type</label>
        <select
          className="sp-select"
          value={feeType}
          onChange={(e) => setFeeType(e.target.value)}
        >
          <option value="">Select fee type</option>
          <option>Tuition Fee</option>
          <option>Admission Fee</option>
          <option>Exam Fee</option>
          <option>Hostel Fee</option>
          <option>Library Fee</option>
          <option>Other</option>
        </select>
      </div>
    </>
  );

  return (
    <ServicePage
      title="School / College Fee"
      accent="#0f766e"
      amountLabel="Fee Amount"
      presets={[1000, 2000, 5000, 10000, 20000]}
      note="Fee receipt will be sent to your registered email."
      fields={fields}
      fieldsValid={fieldsValid}
      getRemarks={() =>
        `Education Fee – ${institution} – ${feeType} – ${studentId}`
      }
      receiverIdentifier={() => getReceiver("EDUCATION", institution)}
    />
  );
}
