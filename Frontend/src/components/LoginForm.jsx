// LoginForm.jsx
// Login form for Kharcha.
//
// Key fixes vs. the old demo version:
//   - Removed hardcoded DEMO_PHONE / DEMO_PASSWORD — now calls the real backend
//   - Identifier field accepts BOTH email AND phone number (same input, same UX)
//   - Backend receives the correct field names it expects:
//       { identifier: "...", credential: "..." }
//     The backend auto-detects whether identifier is an email or phone number,
//     and whether credential is an MPIN or password — we never need to transform it.
//   - All errors come from the backend response and are shown inline under the
//     relevant field as simple red text (no toast libraries).
//   - Loading state disables the submit button during the request.

import { useState } from "react";
import api from "../api";
import InputField from "./InputField";

function LoginForm({ onShowReset }) {
  // ── State ────────────────────────────────────────────────────
  const [identifier, setIdentifier] = useState(""); // email OR phone number
  const [credential, setCredential] = useState(""); // password OR MPIN
  const [errors, setErrors] = useState({}); // { identifier?, credential?, general? }
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Client-side validation (lightweight) ─────────────────────
  // Full validation lives on the backend; we only block obviously-empty fields.
  function validate() {
    const e = {};
    if (!identifier.trim()) e.identifier = "Phone number or email is required";
    if (!credential) e.credential = "Password or MPIN is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Submit handler ───────────────────────────────────────────
  async function handleSubmit() {
    if (!validate()) return;

    setLoading(true);
    setErrors({});
    setSuccessMsg("");

    // Build the payload exactly as the backend expects:
    //   identifier → email or phone number (backend detects which)
    //   credential → password or 6-digit MPIN (backend detects which)
    const payload = {
      identifier: identifier.trim(),
      credential: credential,
    };

    try {
      const { data } = await api.post("/api/auth/signin", payload);

      // Backend returns { success: true, token: "...", account: { ... } }
      if (data.success) {
        // Persist the token for subsequent authenticated requests
        localStorage.setItem("auth_token", data.token);
        setSuccessMsg("Login successful! Welcome back 🎉");
        // TODO: redirect to dashboard — e.g. navigate('/dashboard')
      } else {
        // Backend returned success:false with a message
        setErrors({
          general: data.message || "Login failed. Please try again.",
        });
      }
    } catch (err) {
      // Map HTTP error codes to user-friendly inline messages
      const status = err.response?.status;
      const msg = err.response?.data?.message;

      if (status === 400) {
        // Missing or malformed fields
        setErrors({ general: msg || "Please check your input and try again." });
      } else if (status === 401) {
        // Wrong password / MPIN — show under the credential field
        setErrors({
          credential: msg || "Incorrect password or MPIN. Please try again.",
        });
      } else if (status === 403) {
        // Account deactivated
        setErrors({
          general: msg || "Your account has been deactivated. Contact support.",
        });
      } else if (status === 404) {
        // Account not found
        setErrors({
          identifier:
            msg || "No account found with this email or phone number.",
        });
      } else {
        setErrors({ general: "Something went wrong. Please try again later." });
      }
    } finally {
      setLoading(false);
    }
  }

  // Disable submit only when both fields are completely empty
  const canSubmit =
    identifier.trim().length > 0 && credential.length > 0 && !loading;

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="form-body slide-in">
      {/* General error (e.g. account deactivated) */}
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

      {/* Success message */}
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

      {/* Identifier: email OR phone number — single field, backend detects which */}
      <InputField
        label="Phone Number or Email"
        type="text"
        placeholder="98XXXXXXXX or john@example.com"
        value={identifier}
        onChange={(e) => {
          setIdentifier(e.target.value);
          // Clear relevant errors as user types
          setErrors((prev) => ({ ...prev, identifier: "", general: "" }));
          setSuccessMsg("");
        }}
        icon="phone"
        error={errors.identifier}
      />

      {/* Credential: password or MPIN — single field, backend detects which */}
      <InputField
        label="Password / MPIN"
        type="password"
        placeholder="Enter your password or 6-digit MPIN"
        value={credential}
        onChange={(e) => {
          setCredential(e.target.value);
          setErrors((prev) => ({ ...prev, credential: "", general: "" }));
          setSuccessMsg("");
        }}
        icon="lock"
        error={errors.credential}
      />

      {/* Submit button */}
      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={!canSubmit}
        style={{ marginTop: "16px" }}
      >
        {loading ? "Signing in…" : "Log In to Kharcha"}
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
