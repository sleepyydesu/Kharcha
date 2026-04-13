/**
 * src/pages/services/Education.jsx
 *
 * Education fee payment — Step 1: pick institution from dynamic org list.
 *                         Step 2: fill Student ID + Amount.
 * Route: /services/education
 */

import { useState } from "react";
import ServicePaymentPage from "../../components/ServicePaymentPage";
import OrganizationSelector from "../../components/OrganizationSelector";
import { TextField, AmountField } from "../../components/ServiceField";
import { payEducation } from "../../services/paymentsApi";
import educationIcon from "../../assets/educationIcon.svg";
import { useOrganizations, ORG_TYPES } from "../../hooks/useOrganizations";

function validate({ studentId, amount }) {
  const errs = {};
  if (!studentId.trim()) errs.studentId = "Student ID is required.";
  if (!amount.trim()) errs.amount = "Amount is required.";
  else if (isNaN(amount) || Number(amount) <= 0)
    errs.amount = "Enter a valid amount.";
  return errs;
}

export default function Education() {
  const { orgs, loading, error } = useOrganizations(ORG_TYPES.EDUCATION);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState({});

  if (!selectedOrg) {
    return (
      <OrganizationSelector
        orgs={orgs}
        loading={loading}
        error={error}
        onSelect={setSelectedOrg}
        title="School / College Fee"
        subtitle="Pay tuition and institutional fees."
        icon={educationIcon}
      />
    );
  }

  async function handleSubmit() {
    const errs = validate({ studentId, amount });
    if (Object.keys(errs).length) {
      setErrors(errs);
      throw new Error("Please fix the errors above.");
    }
    setErrors({});
    return await payEducation({
      organization_id: selectedOrg.organization_id,
      institution_name: selectedOrg.organization_name,
      student_id: studentId.trim(),
      amount: Number(amount),
    });
  }

  return (
    <ServicePaymentPage
      icon={educationIcon}
      title="School / College Fee"
      subtitle={`Paying to ${selectedOrg.organization_name}`}
      onSubmit={handleSubmit}
      submitLabel="Pay Fee"
      onBack={() => setSelectedOrg(null)}
    >
      <TextField
        id="edu-student"
        label="Student ID"
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
        placeholder="Your student / roll number"
        error={errors.studentId}
      />
      <AmountField
        id="edu-amount"
        label="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={errors.amount}
      />
    </ServicePaymentPage>
  );
}
