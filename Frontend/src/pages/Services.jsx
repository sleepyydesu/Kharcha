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
      </div>
    </div>
  );
}
