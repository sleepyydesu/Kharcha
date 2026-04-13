/**
 * src/pages/services/Water.jsx
 *
 * Water bill payment — Step 1: pick provider from dynamic org list.
 *                      Step 2: fill Customer ID + Amount.
 * Route: /services/water
 */

import { useState } from "react";
import ServicePaymentPage from "../../components/ServicePaymentPage";
import OrganizationSelector from "../../components/OrganizationSelector";
import { TextField, AmountField } from "../../components/ServiceField";
import { payWater } from "../../services/paymentsApi";
import waterIcon from "../../assets/waterIcon.svg";
import { useOrganizations, ORG_TYPES } from "../../hooks/useOrganizations";

function validate({ customerId, amount }) {
  const errs = {};
  if (!customerId.trim()) errs.customerId = "Customer ID is required.";
  if (!amount.trim()) errs.amount = "Amount is required.";
  else if (isNaN(amount) || Number(amount) <= 0)
    errs.amount = "Enter a valid amount.";
  return errs;
}

export default function Water() {
  const { orgs, loading, error } = useOrganizations(ORG_TYPES.WATER);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState({});

  if (!selectedOrg) {
    return (
      <OrganizationSelector
        orgs={orgs}
        loading={loading}
        error={error}
        onSelect={setSelectedOrg}
        title="Water Bill"
        subtitle="Pay your water utility bill."
        icon={waterIcon}
      />
    );
  }

  async function handleSubmit() {
    const errs = validate({ customerId, amount });
    if (Object.keys(errs).length) {
      setErrors(errs);
      throw new Error("Please fix the errors above.");
    }
    setErrors({});
    return await payWater({
      organization_id: selectedOrg.organization_id,
      region: selectedOrg.organization_name,
      customer_id: customerId.trim(),
      amount: Number(amount),
    });
  }

  return (
    <ServicePaymentPage
      icon={waterIcon}
      title="Water Bill"
      subtitle={`Paying via ${selectedOrg.organization_name}`}
      onSubmit={handleSubmit}
      submitLabel="Pay Bill"
      onBack={() => setSelectedOrg(null)}
    >
      <TextField
        id="water-cid"
        label="Customer ID"
        value={customerId}
        onChange={(e) => setCustomerId(e.target.value)}
        placeholder="Your water bill customer ID"
        error={errors.customerId}
      />
      <AmountField
        id="water-amount"
        label="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={errors.amount}
      />
    </ServicePaymentPage>
  );
}
