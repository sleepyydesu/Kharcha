// LoginForm.jsx
// Login form for Kharcha.
//
// Features:
//   - Phone number field
//   - Single Password / MPIN field (app detects which one automatically)
//   - Validation with inline error messages
//   - Toast banner for success / error feedback
//   - "Forgot password?" link opens the Reset Password page

import { useState } from "react";
import InputField from "./InputField";
import Toast from "./Toast";

// Demo credentials – replace these with real API calls when the backend is ready
const DEMO_PHONE = "9800000000";
const DEMO_PASSWORD = "kharcha123";
const DEMO_MPIN = "1234";

function LoginForm({ onShowReset }) {
  const [phone, setPhone] = useState("");
  const [authValue, setAuthValue] = useState("");
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  // Show a toast banner and auto-hide it after 3 seconds
  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Validate fields and return true if everything is OK
  function validate() {
    const e = {};
    if (!phone) {
      e.phone = "Phone number is required";
    } else if (!/^(97|98)\d{8}$/.test(phone)) {
      e.phone = "Enter a valid Nepali number (97XXXXXXXX or 98XXXXXXXX)";
    }
    if (!authValue) {
      e.auth = "Please enter your password or MPIN";
    } else if (authValue.length < 4) {
      e.auth = "Minimum 4 characters (MPIN) or 6+ characters (password)";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // Handle the Login button click
  function handleSubmit() {
    if (!validate()) return;
    setLoading(true);

    // Simulate a 0.8s network delay, then check credentials
    setTimeout(() => {
      setLoading(false);
      const phoneMatch = phone === DEMO_PHONE;
      const isMpin = authValue.length === 4 && /^\d{4}$/.test(authValue);
      const authMatch = isMpin
        ? authValue === DEMO_MPIN
        : authValue === DEMO_PASSWORD;

      if (phoneMatch && authMatch) {
        showToast("Login successful! Welcome back 🎉", "success");
      } else if (!phoneMatch) {
        showToast(
          "Phone number not found. Please check and try again.",
          "error",
        );
      } else {
        showToast(
          isMpin
            ? "Incorrect MPIN. Please try again."
            : "Incorrect password. Please try again.",
          "error",
        );
      }
    }, 800);
  }

  // Enable the login button only when basic length requirements pass
  const isReady = phone.length === 10 && authValue.length >= 4;

  return (
    <div className="form-body slide-in">
      {/* Feedback toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Phone number */}
      <InputField
        label="Phone Number"
        type="tel"
        placeholder="98XXXXXXXX"
        value={phone}
        onChange={(e) => {
          setPhone(e.target.value);
          setErrors((p) => ({ ...p, phone: "" }));
        }}
        icon="phone"
        error={errors.phone}
        maxLength={10}
      />

      {/* Password / MPIN – single combined field */}
      <InputField
        label="Password / MPIN"
        type="password"
        placeholder="Enter password or 4-digit MPIN"
        value={authValue}
        onChange={(e) => {
          setAuthValue(e.target.value);
          setErrors((p) => ({ ...p, auth: "" }));
        }}
        icon="key"
        error={errors.auth}
      />

      {/* Login button */}
      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={!isReady || loading}
        style={{ marginTop: "16px" }}
      >
        {loading ? "Checking…" : "Log In to Kharcha"}
      </button>

      {/* Footer link */}
      <p className="footer-note">
        Forgot your credentials?{" "}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onShowReset();
          }}
        >
          Reset password
        </a>
      </p>
    </div>
  );
}

export default LoginForm;
