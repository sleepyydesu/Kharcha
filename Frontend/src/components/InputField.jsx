// InputField.jsx
// A reusable input field with:
//   - A label above the input
//   - A clean SVG icon on the left (monochrome, no emoji)
//   - A show/hide toggle for password fields (SVG eye icon)
//   - An error message shown in red below the field
//   - A success message shown in green below the field
//   - onBlur support (used by Confirm Password for blur-time validation)
//
// Props:
//   label       – text above the input
//   type        – 'text' | 'password' | 'tel' | 'email'
//   placeholder – hint text inside the field
//   value       – controlled value
//   onChange    – called when the user types
//   onBlur      – called when the field loses focus (optional)
//   icon        – 'phone' | 'lock' | 'user' | 'building' | 'check' | 'key'
//   error       – red error message string
//   success     – green success message string
//   maxLength   – max characters allowed

import { useState } from "react";

function IconPhone() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconKey() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="15" r="4" />
      <path d="M12 11l9-9" />
      <path d="M17 6l2 2" />
      <path d="M19 4l2 2" />
    </svg>
  );
}

function IconEyeOpen() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconEyeClosed() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

const ICONS = {
  phone: <IconPhone />,
  lock: <IconLock />,
  user: <IconUser />,
  building: <IconBuilding />,
  check: <IconCheck />,
  key: <IconKey />,
};

function InputField({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
  onKeyDown,
  icon,
  error,
  success,
  maxLength,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = type === "password" && showPassword ? "text" : type;
  const iconElement = ICONS[icon] || null;

  return (
    <div className="input-group">
      {label && <label className="input-label">{label}</label>}

      <div className="input-wrapper">
        {iconElement && <span className="input-icon">{iconElement}</span>}

        <input
          className={`input-field ${error ? "error" : ""}`}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          maxLength={maxLength}
          autoComplete="off"
        />

        {type === "password" && (
          <button
            type="button"
            className="toggle-eye"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <IconEyeClosed /> : <IconEyeOpen />}
          </button>
        )}
      </div>

      {/* Error: red text under the field — no toast libraries */}
      {error && <span className="error-msg">⚠ {error}</span>}

      {/* Success: green text under the field */}
      {success && <span className="success-msg">✓ {success}</span>}
    </div>
  );
}

export default InputField;
