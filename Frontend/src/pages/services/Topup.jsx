/**
 * src/pages/services/Topup.jsx
 *
 * Mobile Top-up — NO organization selection step.
 * Direct form: Phone Number + Operator (from telecom orgs) + Amount.
 * Route: /services/topup
 */

import { useState } from "react";
import ServicePaymentPage from "../../components/ServicePaymentPage";
import {
  TextField,
  SelectField,
  AmountField,
} from "../../components/ServiceField";
import { payTopup } from "../../services/paymentsApi";
import topupIcon from "../../assets/topupIcon.svg";
import { useOrganizations, ORG_TYPES } from "../../hooks/useOrganizations";

function validate({ phone, operator, amount }) {
  const errs = {};
  if (!phone.trim()) errs.phone = "Phone number is required.";
  else if (!/^\d{10}$/.test(phone.trim()))
    errs.phone = "Enter a valid 10-digit number.";
  if (!operator) errs.operator = "Please select an operator.";
  if (!amount.trim()) errs.amount = "Amount is required.";
  else if (isNaN(amount) || Number(amount) <= 0)
    errs.amount = "Enter a valid amount.";
  return errs;
}

export default function Topup() {
  // Use telecom orgs (org_type_id=2) for operator list — dynamic!
  const { orgs: telecomOrgs, loading: orgsLoading } = useOrganizations(
    ORG_TYPES.TELECOM,
  );

  const [phone, setPhone] = useState("");
  const [operator, setOperator] = useState("");
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState({});

  // Convert org list to SelectField format
  const operatorOptions = telecomOrgs.map((o) => ({
    value: o.organization_id,
    label: o.organization_name,
  }));

  async function handleSubmit() {
    const errs = validate({ phone, operator, amount });
    if (Object.keys(errs).length) {
      setErrors(errs);
      throw new Error("Please fix the errors above.");
    }
    setErrors({});

    const selectedOrg = telecomOrgs.find((o) => o.organization_id === operator);

    return await payTopup({
      phone_number: phone.trim(),
      operator: selectedOrg?.organization_name ?? operator,
      organization_id: operator,
      amount: Number(amount),
    });
  }

  return (
    <ServicePaymentPage
      icon={topupIcon}
      title="Mobile Top-up"
      subtitle="Recharge your mobile number instantly."
      onSubmit={handleSubmit}
      submitLabel="Recharge Now"
    >
      <TextField
        id="topup-phone"
        label="Phone Number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="98XXXXXXXX"
        type="tel"
        inputMode="numeric"
        maxLength={10}
        error={errors.phone}
      />
      <SelectField
        id="topup-operator"
        label="Operator"
        value={operator}
        onChange={(e) => setOperator(e.target.value)}
        options={
          orgsLoading
            ? [{ value: "", label: "Loading operators…" }]
            : operatorOptions
        }
        error={errors.operator}
      />
      <AmountField
        id="topup-amount"
        label="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="100"
        error={errors.amount}
      />
    </ServicePaymentPage>
  );
}
