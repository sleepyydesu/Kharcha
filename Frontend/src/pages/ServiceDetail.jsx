import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  biometricVerifyTransactionApi,
  getServiceCatalog,
  getServiceTestAccounts,
  getWallet,
  lookupServiceBill,
  transfer,
} from "../services/api";
import {
  biometricTxLogin,
  clearSavedBiometricTxUser,
  getSavedBiometricTxUser,
  isBiometricAvailable,
} from "../hooks/useBiometric";
import fingerprintIcon from "../assets/fingerprintIcon.svg";
import { SERVICE_UI } from "./serviceConfig";
import "./ServiceDetail.css";

const MOBILE_PREFIXES = {
  NTC: ["984", "985", "976"],
  Ncell: ["980", "981", "970"],
};

function detectMobileProvider(phone, providers) {
  const prefix = phone.slice(0, 3);
  const providerName = Object.entries(MOBILE_PREFIXES).find(([, prefixes]) =>
    prefixes.includes(prefix),
  )?.[0];

  if (!providerName) return null;
  return (
    providers.find(
      (provider) => provider.organization_name === providerName,
    ) || null
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function ProviderLogo({ provider, color }) {
  const initials = provider.organization_name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <span
      className="bill-provider-logo"
      style={{ "--provider-color": color }}
    >
      {provider.logo_url ? (
        <img src={provider.logo_url} alt="" />
      ) : (
        <span>{initials}</span>
      )}
    </span>
  );
}

function MpinOverlay({
  amount,
  providerName,
  busy,
  error,
  onClose,
  onConfirm,
}) {
  const [mpin, setMpin] = useState("");
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  function press(key) {
    if (busy) return;
    if (key === "del") setMpin((value) => value.slice(0, -1));
    else setMpin((value) => (value.length < 6 ? value + key : value));
  }

  return (
    <div
      className="bill-mpin-backdrop"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="bill-mpin">
        <span className="bill-mpin__handle" />
        <h2>Enter MPIN</h2>
        <p>
          Confirm NPR {Number(amount).toLocaleString()} payment to{" "}
          <strong>{providerName}</strong>
        </p>
        <div className="bill-mpin__dots">
          {Array.from({ length: 6 }).map((_, index) => (
            <span
              key={index}
              className={index < mpin.length ? "is-filled" : ""}
            />
          ))}
        </div>
        {error && <div className="bill-error bill-error--compact">{error}</div>}
        <div className="bill-mpin__pad">
          {keys.map((key, index) => (
            <button
              key={`${key}-${index}`}
              className={key === "" ? "is-empty" : ""}
              type="button"
              disabled={busy || key === ""}
              onClick={() => press(key)}
            >
              {key === "del" ? "⌫" : key}
            </button>
          ))}
        </div>
        <button
          className="bill-primary-btn"
          type="button"
          disabled={busy || mpin.length !== 6}
          onClick={() => onConfirm(mpin)}
        >
          {busy ? "Processing…" : "Confirm payment"}
        </button>
      </div>
    </div>
  );
}

export default function ServiceDetail() {
  const { type } = useParams();
  const navigate = useNavigate();
  const config = SERVICE_UI[type];

  const [providers, setProviders] = useState([]);
  const [testAccounts, setTestAccounts] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [identifier, setIdentifier] = useState("");
  const [topupAmount, setTopupAmount] = useState("");
  const [bill, setBill] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [step, setStep] = useState("providers");
  const [loading, setLoading] = useState(true);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [error, setError] = useState("");
  const [showMpin, setShowMpin] = useState(false);
  const [biometricReady, setBiometricReady] = useState(false);
  const [transaction, setTransaction] = useState(null);

  useEffect(() => {
    if (!config) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getServiceCatalog(),
      getServiceTestAccounts(type),
      getWallet().catch(() => null),
    ])
      .then(([catalog, tests, walletResult]) => {
        if (cancelled) return;
        const related = (catalog.providers || []).filter((provider) => {
          if (provider.org_type_id !== config.orgTypeId) return false;
          return (
            !config.providerNames ||
            config.providerNames.includes(provider.organization_name)
          );
        });
        setProviders(related);
        setTestAccounts(tests.test_accounts || []);
        setWallet(walletResult?.wallet || null);

        if (type === "topup") {
          setStep("account");
        } else if (type === "landline" && related.length === 1) {
          setSelectedProvider(related[0]);
          setStep("account");
        }
      })
      .catch((err) => setError(err.message || "Unable to load providers."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [config, type]);

  useEffect(() => {
    async function checkBiometric() {
      if ((await isBiometricAvailable()) && getSavedBiometricTxUser()) {
        setBiometricReady(true);
      }
    }
    checkBiometric();
  }, []);

  const testIdentifier = useMemo(
    () =>
      testAccounts.find(
        (item) =>
          item.organization_id === selectedProvider?.organization_id,
      )?.test_identifier || "",
    [selectedProvider, testAccounts],
  );

  if (!config) {
    return (
      <div className="bill-center">
        <h1>Service not found</h1>
        <button type="button" onClick={() => navigate("/services")}>
          Back to services
        </button>
      </div>
    );
  }

  function goBack() {
    setError("");
    if (showMpin) return setShowMpin(false);
    if (step === "review") {
      setStep("account");
      return;
    }
    if (step === "account") {
      if (type === "topup" || type === "landline") {
        navigate("/services");
        return;
      }
      setSelectedProvider(null);
      setIdentifier("");
      setBill(null);
      setStep("providers");
      return;
    }
    navigate("/services");
  }

  function selectProvider(provider) {
    setSelectedProvider(provider);
    setIdentifier("");
    setTopupAmount("");
    setBill(null);
    setError("");
    setStep("account");
  }

  async function findBill(event) {
    event.preventDefault();
    if (!identifier.trim()) return;
    if (type === "topup") {
      const normalizedPhone = identifier.replace(/\D/g, "");
      const amount = Number(topupAmount);
      if (!/^(97|98)\d{8}$/.test(normalizedPhone)) {
        setError("Enter a valid 10-digit mobile number.");
        return;
      }
      if (!amount || amount < 10 || amount > 5000) {
        setError("Enter a top-up amount between NPR 10 and NPR 5,000.");
        return;
      }
      if (!selectedProvider) {
        setError(
          "Unsupported mobile prefix. Use NTC (984, 985, 976) or Ncell (980, 981, 970).",
        );
        return;
      }

      setError("");
      setBill({
        service: "topup",
        service_label: "Mobile Topup",
        organization_id: selectedProvider.organization_id,
        receiver_account_id: selectedProvider.account_id,
        organization_name: selectedProvider.organization_name,
        identifier: normalizedPhone,
        identifier_label: "Mobile number",
        customer_name: normalizedPhone,
        amount,
        currency: "NPR",
        bill_reference: `TOPUP-${normalizedPhone.slice(-4)}`,
        billing_period: "Prepaid recharge",
        due_date: new Date().toISOString(),
      });
      setStep("review");
      return;
    }

    setLookupBusy(true);
    setError("");
    try {
      const response = await lookupServiceBill({
        service: type,
        organization_id: selectedProvider.organization_id,
        identifier: identifier.trim(),
      });
      setBill(response.bill);
      setStep("review");
    } catch (err) {
      setError(err.message || "Account not found.");
    } finally {
      setLookupBusy(false);
    }
  }

  function paymentPayload(authorization) {
    return {
      receiver_identifier: bill.receiver_account_id,
      amount: bill.amount,
      remarks: `${bill.service_label} · ${bill.organization_name} · ${bill.identifier} · Ref ${bill.bill_reference}`,
      ...authorization,
    };
  }

  async function completePayment(authorization) {
    setPaymentBusy(true);
    setError("");
    try {
      const response = await transfer(paymentPayload(authorization));
      setTransaction(response.transaction);
      setShowMpin(false);
      setStep("success");
    } catch (err) {
      setError(err.message || "Payment failed.");
      throw err;
    } finally {
      setPaymentBusy(false);
    }
  }

  async function payWithBiometric() {
    try {
      setPaymentBusy(true);
      setError("");
      const { biometric_token } = await biometricTxLogin(
        biometricVerifyTransactionApi,
      );
      await completePayment({ biometric_token });
    } catch (err) {
      if (err.message?.includes("Credential not found")) {
        clearSavedBiometricTxUser();
        setBiometricReady(false);
      }
      if (!error) {
        setError(
          err.name === "NotAllowedError"
            ? "Fingerprint verification was cancelled."
            : err.message || "Biometric verification failed.",
        );
      }
    } finally {
      setPaymentBusy(false);
    }
  }

  if (step === "success") {
    return (
      <div className="bill-center">
        <div className="bill-success__icon">✓</div>
        <span className="bill-success__eyebrow">Payment successful</span>
        <h1>NPR {Number(bill.amount).toLocaleString()}</h1>
        <p>
          Your {bill.service_label.toLowerCase()} payment to{" "}
          {bill.organization_name} is complete.
        </p>
        <div className="bill-receipt">
          <div><span>Customer</span><strong>{bill.customer_name}</strong></div>
          <div><span>Account</span><strong>{bill.identifier}</strong></div>
          <div><span>Bill reference</span><strong>{bill.bill_reference}</strong></div>
          <div>
            <span>Transaction</span>
            <strong>{transaction?.transaction_id?.slice(0, 8).toUpperCase()}</strong>
          </div>
        </div>
        <button
          className="bill-primary-btn"
          type="button"
          onClick={() => navigate("/statements")}
        >
          View statement
        </button>
        <button
          className="bill-ghost-btn"
          type="button"
          onClick={() => navigate("/services")}
        >
          Back to services
        </button>
      </div>
    );
  }

  return (
    <div className="bill-page" style={{ "--service-color": config.color }}>
      <header className="bill-header">
        <button className="bill-back" type="button" onClick={goBack}>
          <BackIcon /> Back
        </button>
        <div className="bill-header__service">
          <span className="bill-header__icon">
            <img src={config.icon} alt="" />
          </span>
          <div>
            <h1>{config.label}</h1>
            <p>
              {step === "providers"
                ? "Choose your service provider"
                : step === "account"
                  ? `Enter your ${config.label.toLowerCase()} account`
                  : "Review and confirm payment"}
            </p>
          </div>
        </div>
        <div className="bill-steps" aria-label="Payment progress">
          {["providers", "account", "review"].map((item, index) => (
            <span
              key={item}
              className={
                ["providers", "account", "review"].indexOf(step) >= index
                  ? "is-active"
                  : ""
              }
            />
          ))}
        </div>
      </header>

      <main className="bill-content">
        {step === "providers" && (
          <section>
            <div className="bill-section-title">
              <div>
                <span>Available providers</span>
                <h2>Select provider</h2>
              </div>
              <small>{providers.length} connected</small>
            </div>

            {loading ? (
              <div className="bill-state"><span className="bill-spinner" />Loading providers…</div>
            ) : error ? (
              <div className="bill-error">{error}</div>
            ) : (
              <div className="bill-provider-list">
                {providers.map((provider) => (
                  <button
                    key={provider.organization_id}
                    className="bill-provider"
                    type="button"
                    onClick={() => selectProvider(provider)}
                  >
                    <ProviderLogo provider={provider} color={config.color} />
                    <span>
                      <strong>{provider.organization_name}</strong>
                      <small>Kharcha verified provider</small>
                    </span>
                    <ChevronIcon />
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {step === "account" && (selectedProvider || type === "topup") && (
          <section className="bill-account-card">
            {type === "topup" ? (
              <div className="bill-topup-heading">
                <span className="bill-topup-heading__icon">
                  <img src={config.icon} alt="" />
                </span>
                <span>
                  <small>Prepaid recharge</small>
                  <strong>Enter mobile number and amount</strong>
                </span>
              </div>
            ) : (
              <div className="bill-selected-provider">
                <ProviderLogo provider={selectedProvider} color={config.color} />
                <span>
                  <small>Paying to</small>
                  <strong>{selectedProvider.organization_name}</strong>
                </span>
                {type !== "landline" && (
                  <button type="button" onClick={() => setStep("providers")}>
                    Change
                  </button>
                )}
              </div>
            )}

            <form onSubmit={findBill}>
              <label htmlFor="bill-identifier">
                {type === "electricity"
                  ? "SC number"
                  : type === "education"
                    ? "Student ID / Roll number"
                    : type === "topup"
                      ? "Mobile number"
                      : type === "landline"
                        ? "Landline number"
                        : "Username / Customer ID"}
              </label>
              <input
                id="bill-identifier"
                value={identifier}
                onChange={(event) => {
                  setIdentifier(
                    type === "topup"
                      ? event.target.value.replace(/\D/g, "").slice(0, 10)
                      : event.target.value,
                  );
                  if (type === "topup") {
                    const phone = event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10);
                    setSelectedProvider(detectMobileProvider(phone, providers));
                  }
                  setError("");
                }}
                placeholder={
                  type === "topup"
                    ? "98XXXXXXXX"
                    : testIdentifier || "Enter account identifier"
                }
                inputMode={type === "topup" ? "numeric" : undefined}
                autoFocus
              />

              {type === "topup" && identifier.length >= 3 && (
                <div
                  className={`bill-network-status${
                    selectedProvider ? " is-detected" : " is-unsupported"
                  }`}
                >
                  {selectedProvider ? (
                    <>
                      <ProviderLogo
                        provider={selectedProvider}
                        color={config.color}
                      />
                      <span>
                        <small>Network detected</small>
                        <strong>{selectedProvider.organization_name}</strong>
                      </span>
                      <span className="bill-network-status__check">✓</span>
                    </>
                  ) : (
                    <>
                      <span className="bill-network-status__warning">!</span>
                      <span>
                        <small>Unsupported prefix</small>
                        <strong>
                          NTC: 984, 985, 976 · Ncell: 980, 981, 970
                        </strong>
                      </span>
                    </>
                  )}
                </div>
              )}

              {type === "topup" && (
                <div className="bill-topup-amount">
                  <label htmlFor="topup-amount">Recharge amount</label>
                  <div className="bill-topup-amount__input">
                    <span>NPR</span>
                    <input
                      id="topup-amount"
                      type="number"
                      min="10"
                      max="5000"
                      value={topupAmount}
                      onChange={(event) => {
                        setTopupAmount(event.target.value);
                        setError("");
                      }}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div className="bill-topup-presets">
                    {[50, 100, 200, 500, 1000].map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        className={
                          Number(topupAmount) === amount ? "is-active" : ""
                        }
                        onClick={() => setTopupAmount(String(amount))}
                      >
                        {amount.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {testIdentifier && type !== "topup" && (
                <button
                  className="bill-demo"
                  type="button"
                  onClick={() => {
                    setIdentifier(testIdentifier);
                    setError("");
                  }}
                >
                  <span>Demo account</span>
                  <strong>{testIdentifier}</strong>
                  <small>Tap to use</small>
                </button>
              )}

              {error && <div className="bill-error">{error}</div>}

              <button
                className="bill-primary-btn"
                type="submit"
                disabled={
                  !identifier.trim() ||
                  lookupBusy ||
                  (type === "topup" &&
                    (!Number(topupAmount) || !selectedProvider))
                }
              >
                {lookupBusy
                  ? "Checking account…"
                  : type === "topup"
                    ? "Review top-up"
                    : "View bill"}
              </button>
            </form>
            <p className="bill-help">
              {type === "topup"
                ? "The recharge is sent instantly to the entered prepaid mobile number."
                : "The amount is fetched securely from the provider and cannot be edited."}
            </p>
          </section>
        )}

        {step === "review" && bill && (
          <section className="bill-review">
            <div className="bill-amount-card">
              <span>Amount due</span>
              <div><small>NPR</small>{Number(bill.amount).toLocaleString()}</div>
              <p>
                {type === "topup"
                  ? "Instant prepaid recharge"
                  : `Due ${new Date(bill.due_date).toLocaleDateString("en-NP", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}`}
              </p>
            </div>

            <div className="bill-summary">
              <div>
                <span>Provider</span>
                <strong>{bill.organization_name}</strong>
              </div>
              <div>
                <span>Customer</span>
                <strong>{bill.customer_name}</strong>
              </div>
              <div>
                <span>{bill.identifier_label}</span>
                <strong>{bill.identifier}</strong>
              </div>
              <div>
                <span>Billing period</span>
                <strong>{bill.billing_period}</strong>
              </div>
              <div>
                <span>Reference</span>
                <strong>{bill.bill_reference}</strong>
              </div>
              <div>
                <span>Pay from</span>
                <strong>
                  Kharcha Wallet
                  {wallet
                    ? ` · NPR ${Number(wallet.balance).toLocaleString()}`
                    : ""}
                </strong>
              </div>
            </div>

            {wallet && Number(wallet.balance) < Number(bill.amount) && (
              <div className="bill-error">Insufficient wallet balance.</div>
            )}
            {error && <div className="bill-error">{error}</div>}

            <button
              className="bill-primary-btn"
              type="button"
              onClick={() => {
                setError("");
                setShowMpin(true);
              }}
              disabled={
                paymentBusy ||
                (wallet && Number(wallet.balance) < Number(bill.amount))
              }
            >
              Confirm &amp; enter MPIN
            </button>
            {biometricReady && (
              <>
                <div className="bill-or"><span>OR</span></div>
                <button
                  className="bill-biometric-btn"
                  type="button"
                  onClick={payWithBiometric}
                  disabled={
                    paymentBusy ||
                    (wallet && Number(wallet.balance) < Number(bill.amount))
                  }
                >
                  <img src={fingerprintIcon} alt="" />
                  {paymentBusy ? "Verifying…" : "Use Fingerprint"}
                </button>
              </>
            )}
          </section>
        )}
      </main>

      {showMpin && bill && (
        <MpinOverlay
          amount={bill.amount}
          providerName={bill.organization_name}
          busy={paymentBusy}
          error={error}
          onClose={() => !paymentBusy && setShowMpin(false)}
          onConfirm={async (mpin) => {
            try {
              await completePayment({ mpin });
            } catch {
              // Error is shown inside the overlay so the user can retry.
            }
          }}
        />
      )}
    </div>
  );
}
