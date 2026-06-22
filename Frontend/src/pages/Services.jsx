import { useNavigate } from "react-router-dom";
import KharchaLogo from "../components/KharchaLogo";
import { SERVICE_UI } from "./serviceConfig";
import "./Services.css";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function GroupsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export default function Services() {
  const navigate = useNavigate();

  return (
    <div className="services-page">
      <div className="services-body">
        <section className="services-hero">
          <div>
            <span className="services-eyebrow">Payments</span>
            <h1 className="services-title">Pay everyday bills</h1>
            <p className="services-sub">
              Choose a service, find your provider, and confirm securely from
              your Kharcha wallet.
            </p>
          </div>
          <div className="services-hero__mark" aria-hidden="true">
            <KharchaLogo size={46} />
          </div>
        </section>

        <section className="services-panel">
          <div className="services-panel__heading">
            <div>
              <h2>Recharge &amp; bill payments</h2>
              <p>Fast, secure and available 24/7</p>
            </div>
            <span className="services-secure">Secure checkout</span>
          </div>

          <div className="svc-grid">
            {Object.entries(SERVICE_UI).map(([key, service]) => (
              <button
                key={key}
                className="svc-item"
                onClick={() => navigate(`/services/${key}`)}
                type="button"
              >
                <span
                  className="svc-item__icon-wrap"
                  style={{
                    "--service-color": service.color,
                    "--service-tint": `${service.color}16`,
                  }}
                >
                  <img src={service.icon} alt="" />
                </span>
                <span className="svc-item__copy">
                  <strong>{service.shortLabel}</strong>
                  <small>{service.description}</small>
                </span>
                <span className="svc-item__arrow">
                  <ArrowIcon />
                </span>
              </button>
            ))}
          </div>
        </section>

        <button
          className="services-card-banner"
          onClick={() => navigate("/card")}
          type="button"
        >
          <span className="services-card-banner__chip" />
          <span>
            <strong>Kharcha Card</strong>
            <small>Manage your physical and virtual cards</small>
          </span>
          <span className="services-card-banner__cta">Manage card →</span>
        </button>

        <button
          className="services-groups-banner"
          onClick={() => navigate("/groups")}
          type="button"
        >
          <span className="services-groups-banner__icon">
            <GroupsIcon />
          </span>
          <span className="services-groups-banner__copy">
            <strong>Kharcha Groups</strong>
            <small>Split bills, collect shares, and settle together</small>
          </span>
          <span className="services-groups-banner__cta">
            Open groups <ArrowIcon />
          </span>
        </button>
      </div>
    </div>
  );
}
