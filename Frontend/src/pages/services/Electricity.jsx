/**
 * src/pages/services/Electricity.jsx
 *
 * Electricity bill payment — Step 1: pick provider from dynamic org list.
 *                            Step 2: fill Meter ID + Amount.
 * Route: /services/electricity
 */

import { useState } from "react";
import ServicePaymentPage from "../../components/ServicePaymentPage";
import OrganizationSelector from "../../components/OrganizationSelector";
import { TextField, AmountField } from "../../components/ServiceField";
import { payElectricity } from "../../services/paymentsApi";
import electricityIcon from "../../assets/electricityIcon.svg";
import { useOrganizations, ORG_TYPES } from "../../hooks/useOrganizations";

function validate({ meterId, amount }) {
  const errs = {};
  if (!meterId.trim()) errs.meterId = "Meter / Customer ID is required.";
  if (!amount.trim()) errs.amount = "Amount is required.";
  else if (isNaN(amount) || Number(amount) <= 0)
    errs.amount = "Enter a valid amount.";
  return errs;
}

export default function Electricity() {
  const { orgs, loading, error } = useOrganizations(ORG_TYPES.ELECTRICITY);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [meterId, setMeterId] = useState("");
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState({});

  if (!selectedOrg) {
    return (
      <OrganizationSelector
        orgs={orgs}
        loading={loading}
        error={error}
        onSelect={setSelectedOrg}
        title="Electricity Bill"
        subtitle="Pay your electricity bill."
        icon={electricityIcon}
      />
    );
  }

  async function handleSubmit() {
    const errs = validate({ meterId, amount });
    if (Object.keys(errs).length) {
      setErrors(errs);
      throw new Error("Please fix the errors above.");
    }
    setErrors({});
    return await payElectricity({
      organization_id: selectedOrg.organization_id,
      provider: selectedOrg.organization_name,
      meter_id: meterId.trim(),
      amount: Number(amount),
    });
  }

  return (
    <ServicePaymentPage
      icon={electricityIcon}
      title="Electricity Bill"
      subtitle={`Paying via ${selectedOrg.organization_name}`}
      onSubmit={handleSubmit}
      submitLabel="Pay Bill"
      onBack={() => setSelectedOrg(null)}
    >
      <TextField
        id="elec-meter"
        label="Meter / Customer ID"
        value={meterId}
        onChange={(e) => setMeterId(e.target.value)}
        placeholder="Your meter number"
        error={errors.meterId}
      />
      <AmountField
        id="elec-amount"
        label="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={errors.amount}
      />
    </ServicePaymentPage>
  );
}
