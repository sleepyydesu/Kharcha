/**
 * ServicePaymentPage.jsx
 *
 * A reusable shell used by every service page (Topup, Internet, etc.).
 *
 * Props:
 *   icon        {string}   – path to the service SVG / PNG asset
 *   title       {string}   – page heading, e.g. "Mobile Top-up"
 *   subtitle    {string}   – short description under the heading
 *   onSubmit    {fn}       – async handler called on form submit
 *   submitLabel {string}   – button text, default "Pay Now"
 *   onBack      {fn|null}  – if provided, Back button calls this instead of navigate(-1)
 *                            Used for two-step flows (org selection → form)
 *   children    {node}     – form field rows
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ServicePaymentPage.css";

function BackArrow() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export default function ServicePaymentPage({
  icon,
  title,
  subtitle,
  onSubmit,
  submitLabel = "Pay Now",
  onBack = null,
  children,
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  function handleBack() {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    setLoading(true);
    try {
      const result = await onSubmit();
      setSuccess(result?.message || "Payment successful!");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="spp">
      {/* Back */}
      <button className="spp__back" onClick={handleBack} type="button">
        <BackArrow />
        Back
      </button>

      {/* Header */}
      <div className="spp__header">
        <div className="spp__icon-wrap">
          <img src={icon} alt="" className="spp__icon" />
        </div>
        <div>
          <h1 className="spp__title">{title}</h1>
          <p className="spp__sub">{subtitle}</p>
        </div>
      </div>

      {/* Result banners */}
      {success && (
        <div className="spp__banner spp__banner--success" role="alert">
          <span className="spp__banner-icon">✓</span>
          <span>{success}</span>
          <button
            className="spp__banner-close"
            onClick={() => setSuccess(null)}
            type="button"
          >
            ✕
          </button>
        </div>
      )}
      {error && (
        <div className="spp__banner spp__banner--error" role="alert">
          <span className="spp__banner-icon">⚠</span>
          <span>{error}</span>
          <button
            className="spp__banner-close"
            onClick={() => setError(null)}
            type="button"
          >
            ✕
          </button>
        </div>
      )}

      {/* Form */}
      <form className="spp__form" onSubmit={handleSubmit} noValidate>
        <div className="spp__fields">{children}</div>

        <button type="submit" className="spp__submit" disabled={loading}>
          {loading ? (
            <span className="spp__spinner" aria-hidden="true" />
          ) : null}
          {loading ? "Processing…" : submitLabel}
        </button>
      </form>
    </div>
  );
}
