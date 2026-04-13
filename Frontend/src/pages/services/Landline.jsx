/**
 * src/pages/services/Landline.jsx
 *
 * Landline bill payment — Step 1: pick provider from dynamic org list.
 *                         Step 2: fill Phone Number + Amount.
 * Route: /services/landline
 */

import { useState } from "react";
import ServicePaymentPage from "../../components/ServicePaymentPage";
import OrganizationSelector from "../../components/OrganizationSelector";
import { TextField, AmountField } from "../../components/ServiceField";
import { payLandline } from "../../services/paymentsApi";
import landlineIcon from "../../assets/landlineIcon.svg";
import { useOrganizations, ORG_TYPES } from "../../hooks/useOrganizations";

function validate({ phone, amount }) {
  const errs = {};
  if (!phone.trim()) errs.phone = "Phone number is required.";
  else if (!/^\d{7,10}$/.test(phone.trim()))
    errs.phone = "Enter a valid landline number.";
  if (!amount.trim()) errs.amount = "Amount is required.";
  else if (isNaN(amount) || Number(amount) <= 0)
    errs.amount = "Enter a valid amount.";
  return errs;
}

export default function Landline() {
  const { orgs, loading, error } = useOrganizations(ORG_TYPES.TELECOM);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState({});

  if (!selectedOrg) {
    return (
      <OrganizationSelector
        orgs={orgs}
        loading={loading}
        error={error}
        onSelect={setSelectedOrg}
        title="Landline Bill"
        subtitle="Pay your landline telephone bill."
        icon={landlineIcon}
      />
    );
  }

  async function handleSubmit() {
    const errs = validate({ phone, amount });
    if (Object.keys(errs).length) {
      setErrors(errs);
      throw new Error("Please fix the errors above.");
    }
    setErrors({});
    return await payLandline({
      organization_id: selectedOrg.organization_id,
      provider: selectedOrg.organization_name,
      phone_number: phone.trim(),
      amount: Number(amount),
    });
  }

  return (
    <ServicePaymentPage
      icon={landlineIcon}
      title="Landline Bill"
      subtitle={`Paying via ${selectedOrg.organization_name}`}
      onSubmit={handleSubmit}
      submitLabel="Pay Bill"
      onBack={() => setSelectedOrg(null)}
    >
      <TextField
        id="landline-phone"
        label="Phone Number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="01XXXXXXX"
        type="tel"
        inputMode="numeric"
        maxLength={10}
        error={errors.phone}
      />
      <AmountField
        id="landline-amount"
        label="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={errors.amount}
      />
    </ServicePaymentPage>
  );
}
