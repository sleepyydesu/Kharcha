import { useNavigate } from "react-router-dom";
import "./Services.css";

// SVG imports (same pattern as Dashboard)
import topupIconRaw from "../assets/topupIcon.svg?raw";
import internetIconRaw from "../assets/internetIcon.svg?raw";
import landlineIconRaw from "../assets/landlineIcon.svg?raw";
import waterIconRaw from "../assets/waterIcon.svg?raw";
import electricityIconRaw from "../assets/electricityIcon.svg?raw";
import educationIconRaw from "../assets/educationIcon.svg?raw";

import KharchaLogo from "../components/KharchaLogo";

// ─── toCurrentColor (same helper as Dashboard) ───────────────
function toCurrentColor(raw) {
    return raw
        .replace(/stroke="[^"]*"/g, 'stroke="currentColor"')
        .replace(/fill="(?!none)[^"]*"/g, 'fill="currentColor"')
        .replace(/style="[^"]*"/g, "")
        .replace(/width="[^"]*"/, 'width="100%"')
        .replace(/height="[^"]*"/, 'height="100%"');
}

function SvcIcon({ raw, alt, className }) {
    return (
        <span
            className={`svc-icon-wrap ${className ?? ""}`}
            role="img"
            aria-label={alt}
            dangerouslySetInnerHTML={{ __html: toCurrentColor(raw) }}
        />
    );
}

// ─── Service list ─────────────────────────────────────────────
const ALL_SERVICES = [
    { label: "Topup", raw: topupIconRaw, route: "/services/topup" },
    { label: "Internet", raw: internetIconRaw, route: "/services/internet" },
    { label: "Landline", raw: landlineIconRaw, route: "/services/landline" },
    { label: "Water", raw: waterIconRaw, route: "/services/water" },
    {
        label: "Electricity",
        raw: electricityIconRaw,
        route: "/services/electricity",
    },
    {
        label: "School/College",
        raw: educationIconRaw,
        route: "/services/education",
    },
];

// ─── Kharcha Card preview chip ────────────────────────────────
function KharchaCardChip({ onClick }) {
    return (
        <div className="svc-card-section">
            <div className="svc-section-header">
                <h4 className="svc-section-heading">Kharcha Card</h4>
                <span className="svc-section-sub">
                    Your physical RFID wallet card
                </span>
            </div>

            {/* Visual card + CTA */}
            <div
                className="svc-card-preview"
                onClick={onClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && onClick()}
            >
                <div className="svc-card-visual">
                    {/* Decorative blobs */}
                    <div className="svc-card-blob svc-card-blob--1" />
                    <div className="svc-card-blob svc-card-blob--2" />

                    {/* Logo centred */}
                    <div className="svc-card-logo-wrap">
                        <KharchaLogo size={44} />
                        <span className="svc-card-brand">Kharcha</span>
                    </div>

                    {/* Chip icon bottom-left */}
                    <div className="svc-card-chip-icon">
                        <svg
                            width="28"
                            height="22"
                            viewBox="0 0 28 22"
                            fill="none"
                        >
                            <rect
                                x="0.5"
                                y="0.5"
                                width="27"
                                height="21"
                                rx="3.5"
                                stroke="currentColor"
                                strokeOpacity="0.5"
                            />
                            <line
                                x1="9"
                                y1="1"
                                x2="9"
                                y2="21"
                                stroke="currentColor"
                                strokeOpacity="0.4"
                            />
                            <line
                                x1="19"
                                y1="1"
                                x2="19"
                                y2="21"
                                stroke="currentColor"
                                strokeOpacity="0.4"
                            />
                            <line
                                x1="1"
                                y1="7"
                                x2="27"
                                y2="7"
                                stroke="currentColor"
                                strokeOpacity="0.4"
                            />
                            <line
                                x1="1"
                                y1="15"
                                x2="27"
                                y2="15"
                                stroke="currentColor"
                                strokeOpacity="0.4"
                            />
                        </svg>
                    </div>

                    <span className="svc-card-cta">Tap to manage →</span>
                </div>

                <div className="svc-card-info-row">
                    <div className="svc-card-info-item">
                        <span className="svc-card-info-label">Type</span>
                        <span className="svc-card-info-value">
                            RFID Physical Card
                        </span>
                    </div>
                    <div className="svc-card-info-item">
                        <span className="svc-card-info-label">Usage</span>
                        <span className="svc-card-info-value">
                            POS Payments
                        </span>
                    </div>
                    <div className="svc-card-info-item">
                        <span className="svc-card-info-label">Area</span>
                        <span className="svc-card-info-value">Nepal</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Services page ────────────────────────────────────────────
export default function Services() {
    const navigate = useNavigate();

    return (
        <div className="services-page">
            <div className="services-body">
                <h1 className="services-title">Services</h1>
                <p className="services-sub">
                    Recharge, pay bills and manage your card.
                </p>

                {/* All Services */}
                <div className="svc-all-section">
                    <h4 className="svc-section-heading">
                        Recharge &amp; Payments
                    </h4>
                    <div className="svc-grid">
                        {ALL_SERVICES.map(({ label, raw, route }) => (
                            <button
                                key={label}
                                className="svc-item"
                                onClick={() => navigate(route)}
                            >
                                <SvcIcon
                                    raw={raw}
                                    alt={label}
                                    className="svc-item__icon"
                                />
                                <span className="svc-item__label">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Kharcha Card */}
                <KharchaCardChip onClick={() => navigate("/card")} />
            </div>
        </div>
    );
}
