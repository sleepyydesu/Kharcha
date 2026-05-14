import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import "./NotificationToast.css";

const TYPE_CONFIG = {
    warning: { icon: "🔐", accent: "var(--warning-text)", bg: "var(--warning-bg)", border: "var(--warning-border)" },
    success: { icon: "💸", accent: "var(--success-text)", bg: "var(--success-bg)", border: "var(--success-border)" },
    error:   { icon: "❌", accent: "var(--error-text)",   bg: "var(--error-bg)",   border: "var(--error-border)"   },
    info:    { icon: "💡", accent: "var(--primary)",      bg: "var(--kyc-bg)",     border: "var(--kyc-border)"     },
};

export default function NotificationToast() {
    const { notifications, markRead, dismiss } = useNotifications();
    const navigate = useNavigate();

    // Show the first unread notification
    const active = notifications.find((n) => !n.read) || null;

    // Animate in/out
    const [visible, setVisible] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    useEffect(() => {
        if (active && active.id !== currentId) {
            setVisible(false);
            // Small delay so the exit animation plays before swap
            const t = setTimeout(() => {
                setCurrentId(active.id);
                setVisible(true);
            }, 150);
            return () => clearTimeout(t);
        }
        if (!active && visible) {
            setVisible(false);
        }
    }, [active?.id]);

    if (!active) return null;

    const cfg = TYPE_CONFIG[active.type] || TYPE_CONFIG.info;

    function handleClick() {
        markRead(active.id);
        dismiss(active.id);
        if (active.link) navigate(active.link);
    }

    function handleDismiss(e) {
        e.stopPropagation();
        dismiss(active.id);
    }

    return (
        <div
            className={`nt-toast ${visible ? "nt-toast--visible" : ""} ${active.link ? "nt-toast--clickable" : ""}`}
            style={{
                "--nt-accent": cfg.accent,
                "--nt-bg": cfg.bg,
                "--nt-border": cfg.border,
            }}
            onClick={active.link ? handleClick : undefined}
            role={active.link ? "button" : "status"}
            tabIndex={active.link ? 0 : undefined}
            onKeyDown={active.link ? (e) => e.key === "Enter" && handleClick() : undefined}
            aria-label={active.link ? `${active.title} — tap to go there` : active.title}
        >
            {/* Left accent bar */}
            <div className="nt-accent-bar" />

            {/* Icon */}
            <span className="nt-icon">{cfg.icon}</span>

            {/* Text */}
            <div className="nt-body">
                <p className="nt-title">{active.title}</p>
                <p className="nt-text">{active.body}</p>
            </div>

            {/* CTA arrow — only when there's a link */}
            {active.link && (
                <span className="nt-cta" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </span>
            )}

            {/* Dismiss button */}
            <button
                className="nt-dismiss"
                onClick={handleDismiss}
                aria-label="Dismiss notification"
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>
        </div>
    );
}