// SignupForm.jsx
// Multi-step registration — field names match the backend exactly.
//
// What the backend actually requires (read from authController.js):
//
//  POST /api/auth/signup/check
//    { email (required), phone_number (optional), account_type }
//
//  POST /api/auth/signup/send-otp
//    { email }                          ← OTP goes to EMAIL, not phone
//
//  POST /api/auth/signup/verify-otp
//    { email, otp }                     ← email + otp code
//
//  POST /api/auth/signup/complete
//    { signup_token, account_type, password, phone_number (optional),
//      full_name (required when account_type === "user"),
//      organization_name (required when account_type === "organization") }

import { useState, useRef } from "react";
import api from "../api";
import InputField from "./InputField";

// ── Progress Bar ──────────────────────────────────────────────
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

// ── Main SignupForm ───────────────────────────────────────────
function SignupForm() {
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState(""); // 'user' | 'organization'

  const [form, setForm] = useState({
    email: "", // REQUIRED by backend for check + OTP
    phone_number: "", // optional
    full_name: "", // required when accountType === 'user'
    organization_name: "", // required when accountType === 'organization'
    password: "",
    confirmPassword: "",
  });

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [signupToken, setSignupToken] = useState("");
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  // ── Helpers ──────────────────────────────────────────────────

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

  // ── Validation ───────────────────────────────────────────────

  function validateStep1() {
    if (!accountType) {
      setErrors({ userType: "Please select an account type to continue" });
      return false;
    }
    return true;
  }

  function validateStep2() {
    const e = {};

    // Email is REQUIRED (backend /check and /send-otp both need it)
    if (!form.email.trim()) {
      e.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = "Please enter a valid email address";
    }

    // Name field — depends on account type
    if (accountType === "user" && !form.full_name.trim()) {
      e.full_name = "Full name is required";
    }
    if (accountType === "organization" && !form.organization_name.trim()) {
      e.organization_name = "Organization name is required";
    }

    // Phone is optional — validate format only if provided
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
      e.confirmPassword = "Password invalid";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── API calls ─────────────────────────────────────────────────

  // Step 2 → 3: check availability then send OTP to email
  async function checkAndSendOtp() {
    if (!validateStep2()) return;

    setLoading(true);
    setErrors({});

    try {
      // /check requires: email (required), phone_number (optional), account_type
      const checkPayload = {
        email: form.email.trim().toLowerCase(),
        account_type: accountType,
      };
      if (form.phone_number)
        checkPayload.phone_number = form.phone_number.trim();

      const { data: checkData } = await api.post(
        "/api/auth/signup/check",
        checkPayload,
      );

      if (!checkData.success) {
        const field = checkData.field || "general";
        setErrors({
          [field]:
            checkData.message || "This information is already registered.",
        });
        setLoading(false);
        return;
      }

      // /send-otp requires: email ONLY — OTP is sent to email, not phone
      const { data: otpData } = await api.post("/api/auth/signup/send-otp", {
        email: form.email.trim().toLowerCase(),
      });

      if (otpData.success) {
        setStep(3);
        setSuccessMsg("Verification code sent to " + form.email + " 📧");
        setTimeout(() => setSuccessMsg(""), 5000);
      } else {
        setErrors({
          general: otpData.message || "Failed to send code. Please try again.",
        });
      }
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 409) {
        const field = data?.field || "general";
        setErrors({
          [field]:
            data?.message || "An account with these details already exists.",
        });
      } else if (status === 400) {
        const field = data?.field || "general";
        setErrors({
          [field]: data?.message || "Please check your input and try again.",
        });
      } else {
        // No err.response = network error: proxy not set up or backend not running
        const msg = !err.response
          ? "Cannot reach the server. Is the backend running on port 5000?"
          : "Something went wrong. Please try again later.";
        setErrors({ general: msg });
      }
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setLoading(true);
    setErrors({});
    try {
      await api.post("/api/auth/signup/send-otp", {
        email: form.email.trim().toLowerCase(),
      });
      setSuccessMsg("Verification code resent to " + form.email);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch {
      setErrors({ general: "Failed to resend code. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  // Step 3 → 4: verify OTP then complete registration
  async function verifyOtpAndComplete() {
    if (otp.some((d) => d === "")) {
      setErrors({ otp: "Please enter the complete 6-digit code" });
      return;
    }

    setLoading(true);
    setErrors({});

    const otpCode = otp.join("");

    try {
      // /verify-otp requires: email + otp (NOT phone_number)
      const { data: verifyData } = await api.post(
        "/api/auth/signup/verify-otp",
        {
          email: form.email.trim().toLowerCase(),
          otp: otpCode,
        },
      );

      if (!verifyData.success) {
        setErrors({
          otp: verifyData.message || "Invalid code. Please try again.",
        });
        setLoading(false);
        return;
      }

      const token = verifyData.signup_token;
      setSignupToken(token);

      // /complete requires:
      //   signup_token, account_type, password
      //   full_name          — required for account_type === 'user'
      //   organization_name  — required for account_type === 'organization'
      //   phone_number       — optional
      const completePayload = {
        signup_token: token,
        account_type: accountType,
        password: form.password, // plain text — backend hashes it with bcrypt
      };

      if (accountType === "user") {
        completePayload.full_name = form.full_name.trim();
      } else if (accountType === "organization") {
        completePayload.organization_name = form.organization_name.trim();
      }

      if (form.phone_number) {
        completePayload.phone_number = form.phone_number.trim();
      }

      const { data: completeData } = await api.post(
        "/api/auth/signup/complete",
        completePayload,
      );

      if (completeData.success) {
        if (completeData.token) {
          localStorage.setItem("auth_token", completeData.token);
        }
        setStep(4);
      } else {
        setErrors({
          general: completeData.message || "Could not complete registration.",
        });
      }
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 400) {
        setErrors({ otp: data?.message || "Invalid or expired code." });
      } else if (status === 401) {
        // signup_token expired — send user back to restart OTP flow
        setErrors({ general: "Your session expired. Please start over." });
        setTimeout(() => {
          setStep(2);
          setOtp(["", "", "", "", "", ""]);
        }, 2000);
      } else if (status === 409) {
        setErrors({
          general:
            data?.message || "An account with these details already exists.",
        });
      } else {
        setErrors({ general: "Something went wrong. Please try again." });
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

  // ── Derived flags ─────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="form-body slide-in">
      <ProgressBar currentStep={step} />

      {errors.general && (
        <p
          style={{
            color: "var(--error, #e53e3e)",
            fontSize: "13px",
            marginBottom: "12px",
          }}
        >
          {errors.general}
        </p>
      )}
      {successMsg && (
        <p
          style={{
            color: "var(--success, #38a169)",
            fontSize: "13px",
            marginBottom: "12px",
          }}
        >
          {successMsg}
        </p>
      )}

      {/* ── STEP 1: Account type ──────────────────────────────── */}
      {step === 1 && (
        <div className="slide-in">
          <h2 className="step-title">Create Account</h2>
          <p className="step-subtitle">What type of account do you need?</p>

          <div className="type-cards">
            <button
              className={`type-card ${accountType === "user" ? "selected" : ""}`}
              onClick={() => {
                setAccountType("user");
                setErrors({});
              }}
            >
              <div className="type-card-icon">👤</div>
              <div className="type-card-text">
                <h4>Personal Account</h4>
                <p>For individuals – send, receive &amp; manage money</p>
              </div>
            </button>
            <button
              className={`type-card ${accountType === "organization" ? "selected" : ""}`}
              onClick={() => {
                setAccountType("organization");
                setErrors({});
              }}
            >
              <div className="type-card-icon">🏢</div>
              <div className="type-card-text">
                <h4>Organization Account</h4>
                <p>For businesses – collect payments &amp; manage payroll</p>
              </div>
            </button>
          </div>

          {errors.userType && (
            <span className="error-msg">⚠ {errors.userType}</span>
          )}

          <button
            className="btn-primary"
            onClick={() => {
              if (validateStep1()) setStep(2);
            }}
            disabled={!accountType}
          >
            Continue →
          </button>
        </div>
      )}

      {/* ── STEP 2: Details ───────────────────────────────────── */}
      {step === 2 && (
        <div className="slide-in">
          <h2 className="step-title">
            {accountType === "user" ? "Your Details" : "Organization Details"}
          </h2>
          <p className="step-subtitle">
            Fill in your information to set up the account.
          </p>

          {/* Email — REQUIRED (OTP is sent here, not to phone) */}
          <InputField
            label="Email *"
            type="email"
            placeholder="john@example.com"
            value={form.email}
            onChange={(e) => updateForm("email", e.target.value)}
            icon="user"
            error={errors.email}
          />

          {/* Name — changes based on account type */}
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

          {/* Phone — optional */}
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
              if (
                form.confirmPassword &&
                form.password !== form.confirmPassword
              ) {
                setErrors((prev) => ({
                  ...prev,
                  confirmPassword: "Password invalid",
                }));
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
          <button className="btn-secondary" onClick={goBack}>
            ← Back
          </button>
        </div>
      )}

      {/* ── STEP 3: Email OTP ─────────────────────────────────── */}
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
            <span
              className="error-msg"
              style={{
                display: "block",
                textAlign: "center",
                marginBottom: "8px",
              }}
            >
              ⚠ {errors.otp}
            </span>
          )}

          <p
            style={{
              textAlign: "center",
              marginBottom: "8px",
              fontSize: "13px",
              color: "var(--text-muted)",
            }}
          >
            Didn't receive it?{" "}
            <button
              className="resend-link"
              onClick={resendOtp}
              disabled={loading}
            >
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
          <button className="btn-secondary" onClick={goBack}>
            ← Change Email
          </button>
        </div>
      )}

      {/* ── STEP 4: Success ───────────────────────────────────── */}
      {step === 4 && (
        <div
          className="slide-in"
          style={{ textAlign: "center", padding: "24px 0" }}
        >
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎉</div>
          <h2 className="step-title">Account Created!</h2>
          <p className="step-subtitle">
            Welcome to Kharcha! You can now log in with your email
            {form.phone_number ? " or phone number" : ""} and the password you
            set.
          </p>
        </div>
      )}
    </div>
  );
}

export default SignupForm;
