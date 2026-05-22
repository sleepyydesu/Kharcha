// ResetForm.jsx
// 3-step Reset Password flow:
//   Step 1 → Enter email (sends OTP via API)
//   Step 2 → Enter the 6-digit OTP
//   Step 3 → Set a new password (verify OTP + reset via API)

import { useState, useRef } from "react";
import InputField from "./InputField";
import Toast from "./Toast";
import api from "../api";

function ResetForm({ onBack }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  function handleOtpChange(index, value) {
    if (!/^\d?$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value;
    setOtp(updated);
    if (value && index < 5) otpRefs[index + 1].current.focus();
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs[index - 1].current.focus();
    }
  }

  function handleOtpPaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!pasted) return;
    const updated = ["", "", "", "", "", ""];
    pasted.split("").forEach((ch, i) => {
      updated[i] = ch;
    });
    setOtp(updated);
    // focus last filled box or last box
    const focusIdx = Math.min(pasted.length, 5);
    otpRefs[focusIdx].current?.focus();
  }

  // Step 1: validate email, call API to send OTP
  async function handleSendOtp() {
    const e = {};
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      e.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      e.email = "Enter a valid email address";
    }
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setLoading(true);
    try {
      await api.post("/auth/password/forgot-send-otp", { email: trimmed });
      showToast("OTP sent to your registered email address 📧");
      setStep(2);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err.message ||
        "Failed to send OTP. Please try again.";
      setErrors({ email: msg });
    } finally {
      setLoading(false);
    }
  }

  // Step 2: basic OTP completeness check before proceeding
  function handleVerifyOtp() {
    if (otp.some((d) => d === "")) {
      setErrors({ otp: "Please enter the complete 6-digit OTP" });
      return;
    }
    setErrors({});
    setStep(3);
  }

  // Resend OTP
  async function handleResendOtp() {
    setLoading(true);
    try {
      await api.post("/auth/password/forgot-send-otp", {
        email: email.trim().toLowerCase(),
      });
      showToast("OTP resent to your registered email address 📧");
    } catch (err) {
      showToast(
        err?.response?.data?.message || "Failed to resend OTP.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  // Step 3: call reset API with email + otp + new_password
  async function handleResetPassword() {
    const e = {};
    if (!newPassword) {
      e.newPassword = "New password is required";
    } else if (newPassword.length < 8) {
      e.newPassword = "Password must be at least 8 characters";
    }
    if (!confirmPassword) {
      e.confirmPassword = "Please confirm your new password";
    } else if (newPassword !== confirmPassword) {
      e.confirmPassword = "Passwords do not match";
    }
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setLoading(true);
    try {
      await api.post("/auth/password/reset", {
        email: email.trim().toLowerCase(),
        otp: otp.join(""),
        new_password: newPassword,
      });
      showToast("Password reset successful! Please log in. ✅");
      setTimeout(() => onBack(), 2500);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err.message ||
        "Reset failed. Please try again.";
      // If OTP error, send user back to step 2
      if (err?.response?.status === 400) {
        setErrors({ general: msg });
        setStep(2);
        setOtp(["", "", "", "", "", ""]);
        otpRefs[0].current?.focus();
      } else {
        setErrors({ general: msg });
      }
    } finally {
      setLoading(false);
    }
  }

  function getPasswordStrength(pw) {
    if (!pw) return null;
    if (pw.length < 6)
      return { label: "Weak", level: 1, color: "var(--error, #e53e3e)" };
    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasNum = /[0-9]/.test(pw);
    const hasSpec = /[^A-Za-z0-9]/.test(pw);
    if (hasUpper && hasLower && hasNum && hasSpec)
      return { label: "Strong", level: 3, color: "var(--success, #38a169)" };
    if ((hasLower || hasUpper) && hasNum)
      return { label: "Medium", level: 2, color: "var(--warning, #d97706)" };
    return { label: "Weak", level: 1, color: "var(--error, #e53e3e)" };
  }

  const passwordMatch =
    newPassword.length >= 8 &&
    confirmPassword === newPassword &&
    confirmPassword !== "";

  const step3Ready = newPassword.length >= 8 && confirmPassword === newPassword;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <div className="form-body slide-in">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* ── STEP 1: Enter Email ── */}
      {step === 1 && (
        <div className="slide-in">
          <h2 className="step-title">Reset Password</h2>
          <p className="step-subtitle">
            OTP will be sent to your registered email address.
          </p>

          <InputField
            label="Email Address"
            type="email"
            placeholder="john@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((p) => ({ ...p, email: "" }));
            }}
            icon="user"
            error={errors.email}
          />

          <button
            className="btn-primary"
            onClick={handleSendOtp}
            disabled={!emailValid || loading}
          >
            {loading ? "Sending…" : "Send OTP →"}
          </button>
          <button className="btn-secondary" onClick={onBack} disabled={loading}>
            ← Back to Login
          </button>
        </div>
      )}

      {/* ── STEP 2: Enter OTP ── */}
      {step === 2 && (
        <div className="slide-in">
          <h2 className="step-title">Enter OTP</h2>
          <p className="otp-info">
            We sent a 6-digit code to <span className="otp-phone">{email}</span>
            .
          </p>

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
                onPaste={handleOtpPaste}
                aria-label={`OTP digit ${i + 1}`}
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
              onClick={handleResendOtp}
              disabled={loading}
            >
              {loading ? "Sending…" : "Resend OTP"}
            </button>
          </p>

          <button
            className="btn-primary"
            onClick={handleVerifyOtp}
            disabled={otp.some((d) => d === "")}
          >
            Verify OTP →
          </button>
          <button className="btn-secondary" onClick={() => setStep(1)}>
            ← Change Email
          </button>
        </div>
      )}

      {/* ── STEP 3: New Password ── */}
      {step === 3 && (
        <div className="slide-in">
          <h2 className="step-title">New Password</h2>
          <p className="step-subtitle">
            Choose a strong password (at least 8 characters).
          </p>

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

          <InputField
            label="New Password"
            type="password"
            placeholder="Min. 8 characters"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setErrors((p) => ({ ...p, newPassword: "" }));
            }}
            icon="lock"
            error={errors.newPassword}
          />

          {newPassword &&
            (() => {
              const s = getPasswordStrength(newPassword);
              return (
                <div style={{ marginTop: "-8px", marginBottom: "12px" }}>
                  <div
                    style={{ display: "flex", gap: "4px", marginBottom: "4px" }}
                  >
                    {[1, 2, 3].map((lvl) => (
                      <div
                        key={lvl}
                        style={{
                          flex: 1,
                          height: "4px",
                          borderRadius: "2px",
                          background:
                            lvl <= s.level ? s.color : "var(--border, #e2e8f0)",
                          transition: "background 0.25s",
                        }}
                      />
                    ))}
                  </div>
                  <span
                    style={{
                      fontSize: "12px",
                      color: s.color,
                      fontWeight: 600,
                    }}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })()}

          <InputField
            label="Confirm New Password"
            type="password"
            placeholder="Repeat your new password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setErrors((p) => ({ ...p, confirmPassword: "" }));
            }}
            icon="check"
            error={errors.confirmPassword}
            success={passwordMatch ? "Passwords match!" : ""}
          />

          <button
            className="btn-primary"
            onClick={handleResetPassword}
            disabled={!step3Ready || loading}
          >
            {loading ? "Resetting…" : "Reset Password ✓"}
          </button>
          <button
            className="btn-secondary"
            onClick={() => setStep(2)}
            disabled={loading}
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}

export default ResetForm;
