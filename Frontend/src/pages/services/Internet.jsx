/**
 * src/pages/services/Internet.jsx
 *
 * Internet bill payment — Step 1: pick provider from dynamic org list.
 *                         Step 2: fill Customer ID + Amount.
 * Route: /services/internet
 */

import { useState } from "react";
import ServicePaymentPage from "../../components/ServicePaymentPage";
import OrganizationSelector from "../../components/OrganizationSelector";
import { TextField, AmountField } from "../../components/ServiceField";
import { payInternet } from "../../services/paymentsApi";
import internetIcon from "../../assets/internetIcon.svg";
import { useOrganizations, ORG_TYPES } from "../../hooks/useOrganizations";

function validate({ customerId, amount }) {
  const errs = {};
  if (!customerId.trim()) errs.customerId = "Customer ID is required.";
  if (!amount.trim()) errs.amount = "Amount is required.";
  else if (isNaN(amount) || Number(amount) <= 0)
    errs.amount = "Enter a valid amount.";
  return errs;
}

export default function Internet() {
  const { orgs, loading, error } = useOrganizations(ORG_TYPES.INTERNET);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState({});

  // Step 1 — org selection
  if (!selectedOrg) {
    return (
      <OrganizationSelector
        orgs={orgs}
        loading={loading}
        error={error}
        onSelect={setSelectedOrg}
        title="Internet Bill"
        subtitle="Pay your internet service provider bill."
        icon={internetIcon}
      />
    );
  }

  // Step 2 — payment form
  async function handleSubmit() {
    const errs = validate({ customerId, amount });
    if (Object.keys(errs).length) {
      setErrors(errs);
      throw new Error("Please fix the errors above.");
    }
    setErrors({});
    return await payInternet({
      organization_id: selectedOrg.organization_id,
      isp_provider: selectedOrg.organization_name,
      customer_id: customerId.trim(),
      amount: Number(amount),
    });
  }

  return (
    <ServicePaymentPage
      icon={internetIcon}
      title="Internet Bill"
      subtitle={`Paying via ${selectedOrg.organization_name}`}
      onSubmit={handleSubmit}
      submitLabel="Pay Bill"
      onBack={() => setSelectedOrg(null)}
    >
      <TextField
        id="internet-cid"
        label="Customer ID"
        value={customerId}
        onChange={(e) => setCustomerId(e.target.value)}
        placeholder="Your ISP customer ID"
        error={errors.customerId}
      />
      <AmountField
        id="internet-amount"
        label="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={errors.amount}
      />
    </ServicePaymentPage>
  );
}
