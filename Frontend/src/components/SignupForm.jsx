import { useState, useRef } from "react";
import { signupCheck, signupSendOtp, signupVerifyOtp, signupComplete } from "../services/api";
import InputField from "./InputField";

function ProgressBar({ currentStep, totalSteps = 4 }) {
  return (
    <div className="progress-bar">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step, i) => (
        <span key={step} style={{ display: "contents" }}>
          <div
            className={`step-dot ${
              currentStep > step ? "done" : currentStep === step ? "active" : ""
            }`}
          >
            {currentStep > step ? "✓" : step}
          </div>
          {i < totalSteps - 1 && (
            <div className={`step-line ${currentStep > step ? "done" : ""}`} />
          )}
        </span>
      ))}
    </div>
  );
}

function SignupForm({ onLogin }) {
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState("");

  const [form, setForm] = useState({
    email: "",
    phone_number: "",
    full_name: "",
    organization_name: "",
    password: "",
    confirmPassword: "",
  });

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  // Prepend +977 if the user typed a bare 10-digit Nepali number
  function normalizePhone(raw) {
    const val = raw.trim();
    if (!val) return val;
    if (val.startsWith("+977")) return val;
    if (/^(97|98)\d{8}$/.test(val)) return "+977" + val;
    return val;
  }

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "", general: "" }));
  }

  function handleOtpChange(index, value) {
    if (!/^\d?$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value;
    setOtp(updated);
    setErrors((prev) => ({ ...prev, otp: "" }));
    if (value && index < 5) otpRefs[index + 1].current?.focus();
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  }

  function validateStep1() {
    if (!accountType) {
      setErrors({ userType: "Please select an account type to continue" });
      return false;
    }
    return true;
  }

  function validateStep2() {
    const e = {};

    if (!form.email.trim()) {
      e.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = "Please enter a valid email address";
    }

    if (accountType === "user" && !form.full_name.trim()) {
      e.full_name = "Full name is required";
    }
    if (accountType === "organization" && !form.organization_name.trim()) {
      e.organization_name = "Organization name is required";
    }

    if (form.phone_number && !/^(97|98)\d{8}$/.test(form.phone_number)) {
      e.phone_number = "Enter a valid Nepali number (97XXXXXXXX or 98XXXXXXXX)";
    }

    if (!form.password) {
      e.password = "Password is required";
    } else if (form.password.length < 8) {
      e.password = "Password must be at least 8 characters";
    }

    if (!form.confirmPassword) {
      e.confirmPassword = "Please confirm your password";
    } else if (form.password !== form.confirmPassword) {
      e.confirmPassword = "Passwords do not match";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function checkAndSendOtp() {
    if (!validateStep2()) return;

    setLoading(true);
    setErrors({});

    try {
      const checkPayload = {
        email: form.email.trim().toLowerCase(),
        account_type: accountType,
      };
      if (form.phone_number) checkPayload.phone_number = normalizePhone(form.phone_number);

      const checkData = await signupCheck(checkPayload);

      if (!checkData.success) {
        const field = checkData.field || "general";
        setErrors({ [field]: checkData.message || "This information is already registered." });
        setLoading(false);
        return;
      }

      const otpData = await signupSendOtp({ email: form.email.trim().toLowerCase() });

      if (otpData.success) {
        setStep(3);
        setSuccessMsg("Verification code sent to " + form.email + " 📧");
        setTimeout(() => setSuccessMsg(""), 5000);
      } else {
        setErrors({ general: otpData.message || "Failed to send code. Please try again." });
      }
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("409")) {
        setErrors({ general: "An account with these details already exists." });
      } else if (msg.includes("400")) {
        setErrors({ general: "Please check your input and try again." });
      } else {
        setErrors({ general: msg || "Something went wrong. Please try again later." });
      }
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setLoading(true);
    setErrors({});
    try {
      await signupSendOtp({ email: form.email.trim().toLowerCase() });
      setSuccessMsg("Verification code resent to " + form.email);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setErrors({ general: err.message || "Failed to resend code. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtpAndComplete() {
    if (otp.some((d) => d === "")) {
      setErrors({ otp: "Please enter the complete 6-digit code" });
      return;
    }

    setLoading(true);
    setErrors({});

    const otpCode = otp.join("");

    try {
      const verifyData = await signupVerifyOtp({
        email: form.email.trim().toLowerCase(),
        otp: otpCode,
      });

      if (!verifyData.success) {
        setErrors({ otp: verifyData.message || "Invalid code. Please try again." });
        setLoading(false);
        return;
      }

      const completePayload = {
        signup_token: verifyData.signup_token,
        account_type: accountType,
        password: form.password,
      };

      if (accountType === "user") {
        completePayload.full_name = form.full_name.trim();
      } else if (accountType === "organization") {
        completePayload.organization_name = form.organization_name.trim();
      }

      if (form.phone_number) {
        completePayload.phone_number = normalizePhone(form.phone_number);
      }

      const completeData = await signupComplete(completePayload);

      if (completeData.success) {
        if (completeData.token) {
          localStorage.setItem("token", completeData.token);
        }
        setStep(4);
      } else {
        setErrors({ general: completeData.message || "Could not complete registration." });
      }
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("400")) {
        setErrors({ otp: "Invalid or expired code." });
      } else if (msg.includes("401")) {
        setErrors({ general: "Your session expired. Please start over." });
        setTimeout(() => { setStep(2); setOtp(["", "", "", "", "", ""]); }, 2000);
      } else if (msg.includes("409")) {
        setErrors({ general: "An account with these details already exists." });
      } else {
        setErrors({ general: msg || "Something went wrong. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    setErrors({});
    setSuccessMsg("");
    setStep((s) => s - 1);
  }

  const passwordMatch =
    form.password.length >= 8 &&
    form.confirmPassword === form.password &&
    form.confirmPassword !== "";

  const nameReady =
    accountType === "user"
      ? form.full_name.trim().length > 0
      : form.organization_name.trim().length > 0;

  const step2Ready =
    form.email.trim().length > 0 &&
    nameReady &&
    form.password.length >= 8 &&
    form.confirmPassword === form.password;

  const step3Ready = otp.every((d) => d !== "");

  return (
    <div className="form-body slide-in">
      <ProgressBar currentStep={step} />

      {errors.general && (
        <p style={{ color: "var(--error, #e53e3e)", fontSize: "13px", marginBottom: "12px" }}>
          {errors.general}
        </p>
      )}
      {successMsg && (
        <p style={{ color: "var(--success, #38a169)", fontSize: "13px", marginBottom: "12px" }}>
          {successMsg}
        </p>
      )}

      {step === 1 && (
        <div className="slide-in">
          <h2 className="step-title">Create Account</h2>
          <p className="step-subtitle">What type of account do you need?</p>

          <div className="type-cards">
            <button
              className={`type-card ${accountType === "user" ? "selected" : ""}`}
              onClick={() => { setAccountType("user"); setErrors({}); }}
            >
              <div className="type-card-icon">👤</div>
              <div className="type-card-text">
                <h4>Personal Account</h4>
                <p>For individuals – send, receive &amp; manage money</p>
              </div>
            </button>
            <button
              className={`type-card ${accountType === "organization" ? "selected" : ""}`}
              onClick={() => { setAccountType("organization"); setErrors({}); }}
            >
              <div className="type-card-icon">🏢</div>
              <div className="type-card-text">
                <h4>Organization Account</h4>
                <p>For businesses – collect payments &amp; manage payroll</p>
              </div>
            </button>
          </div>

          {errors.userType && <span className="error-msg">⚠ {errors.userType}</span>}

          <button
            className="btn-primary"
            onClick={() => { if (validateStep1()) setStep(2); }}
            disabled={!accountType}
          >
            Continue →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="slide-in">
          <h2 className="step-title">
            {accountType === "user" ? "Your Details" : "Organization Details"}
          </h2>
          <p className="step-subtitle">Fill in your information to set up the account.</p>

          <InputField
            label="Email *"
            type="email"
            placeholder="john@example.com"
            value={form.email}
            onChange={(e) => updateForm("email", e.target.value)}
            icon="user"
            error={errors.email}
          />

          {accountType === "user" ? (
            <InputField
              label="Full Name *"
              type="text"
              placeholder="e.g. Sita Sharma"
              value={form.full_name}
              onChange={(e) => updateForm("full_name", e.target.value)}
              icon="user"
              error={errors.full_name}
            />
          ) : (
            <InputField
              label="Organization Name *"
              type="text"
              placeholder="e.g. Nepal Exports Pvt. Ltd."
              value={form.organization_name}
              onChange={(e) => updateForm("organization_name", e.target.value)}
              icon="building"
              error={errors.organization_name}
            />
          )}

          <InputField
            label="Phone Number (optional)"
            type="tel"
            placeholder="98XXXXXXXX"
            value={form.phone_number}
            onChange={(e) => updateForm("phone_number", e.target.value)}
            icon="phone"
            error={errors.phone_number}
            maxLength={10}
          />

          <InputField
            label="Password *"
            type="password"
            placeholder="Min. 8 characters"
            value={form.password}
            onChange={(e) => updateForm("password", e.target.value)}
            icon="lock"
            error={errors.password}
          />

          <InputField
            label="Confirm Password *"
            type="password"
            placeholder="Repeat your password"
            value={form.confirmPassword}
            onChange={(e) => updateForm("confirmPassword", e.target.value)}
            onBlur={() => {
              if (form.confirmPassword && form.password !== form.confirmPassword) {
                setErrors((prev) => ({ ...prev, confirmPassword: "Passwords do not match" }));
              }
            }}
            icon="check"
            error={errors.confirmPassword}
            success={passwordMatch ? "Passwords match!" : ""}
          />

          <button
            className="btn-primary"
            onClick={checkAndSendOtp}
            disabled={!step2Ready || loading}
          >
            {loading ? "Checking…" : "Send Verification Code →"}
          </button>
          <button className="btn-secondary" onClick={goBack}>← Back</button>
        </div>
      )}

      {step === 3 && (
        <div className="slide-in">
          <h2 className="step-title">Verify Email</h2>
          <p className="otp-info">
            We sent a 6-digit code to{" "}
            <span className="otp-phone">{form.email}</span>.
            <br />
            Check your inbox and enter the code below.
          </p>

          <div className="otp-row">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={otpRefs[i]}
                className="otp-box"
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                aria-label={`Code digit ${i + 1}`}
              />
            ))}
          </div>

          {errors.otp && (
            <span className="error-msg" style={{ display: "block", textAlign: "center", marginBottom: "8px" }}>
              ⚠ {errors.otp}
            </span>
          )}

          <p style={{ textAlign: "center", marginBottom: "8px", fontSize: "13px", color: "var(--text-muted)" }}>
            Didn't receive it?{" "}
            <button className="resend-link" onClick={resendOtp} disabled={loading}>
              Resend code
            </button>
          </p>

          <button
            className="btn-primary"
            onClick={verifyOtpAndComplete}
            disabled={!step3Ready || loading}
          >
            {loading ? "Verifying…" : "Verify & Create Account"}
          </button>
          <button className="btn-secondary" onClick={goBack}>← Change Email</button>
        </div>
      )}

      {step === 4 && (
        <div className="slide-in" style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎉</div>
          <h2 className="step-title">Account Created!</h2>
          <p className="step-subtitle">
            Welcome to Kharcha! You can now log in with your email
            {form.phone_number ? " or phone number" : ""} and the password you set.
          </p>
          <button className="btn-primary" onClick={onLogin} style={{ marginTop: "16px" }}>
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}

export default SignupForm;