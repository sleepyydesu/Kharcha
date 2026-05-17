/**
 * src/components/OrganizationSelector.jsx
 *
 * Renders a card grid of organizations for the user to choose from.
 * Used by Internet, Landline, Water, Electricity, Education pages.
 *
 * Props:
 *   orgs      {Array}  – filtered org list [{ organization_id, organization_name }]
 *   loading   {bool}
 *   error     {string|null}
 *   onSelect  {fn}     – called with the selected org object
 *   title     {string} – heading above the grid
 *   subtitle  {string}
 *   icon      {string} – service icon src
 */

import { useNavigate } from "react-router-dom";
import "./OrganizationSelector.css";

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

function OrgInitials({ name }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return <span className="org-card__initials">{initials}</span>;
}

export default function OrganizationSelector({
  orgs,
  loading,
  error,
  onSelect,
  title,
  subtitle,
  icon,
}) {
  const navigate = useNavigate();

  return (
    <div className="org-sel">
      <button
        className="org-sel__back"
        onClick={() => navigate(-1)}
        type="button"
      >
        <BackArrow />
        Back
      </button>

      <div className="org-sel__header">
        <div className="org-sel__icon-wrap">
          <img src={icon} alt="" className="org-sel__icon" />
        </div>
        <div>
          <h1 className="org-sel__title">{title}</h1>
          <p className="org-sel__sub">{subtitle}</p>
        </div>
      </div>

      <p className="org-sel__prompt">Select your provider to continue</p>

      {loading && (
        <div className="org-sel__loading">
          <span className="org-sel__spinner" />
          <span>Loading providers…</span>
        </div>
      )}

      {error && (
        <div className="org-sel__error">
          <span>⚠</span> {error}
        </div>
      )}

      {!loading && !error && orgs.length === 0 && (
        <div className="org-sel__empty">No providers available right now.</div>
      )}

      {!loading && !error && orgs.length > 0 && (
        <div className="org-sel__grid">
          {orgs.map((org) => (
            <button
              key={org.organization_id}
              className="org-card"
              onClick={() => onSelect(org)}
              type="button"
            >
              <OrgInitials name={org.organization_name} />
              <span className="org-card__name">{org.organization_name}</span>
              <span className="org-card__arrow">→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
