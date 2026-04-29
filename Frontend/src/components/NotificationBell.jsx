import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import "./NotificationBell.css";

const TYPE_ICONS = {
    warning: "⚠️",
    success: "✅",
    error: "❌",
    info: "💡",
};

function timeAgo(ts) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${d}d ago`;
}

export default function NotificationBell() {
    const { notifications, unreadCount, markRead, markAllRead, dismiss } =
        useNotifications();
    const [open, setOpen] = useState(false);
    const panelRef = useRef(null);
    const navigate = useNavigate();

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        function handler(e) {
            if (!panelRef.current?.contains(e.target)) setOpen(false);
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const handleItemClick = (n) => {
        markRead(n.id);
        setOpen(false);
        if (n.link) navigate(n.link);
    };

    return (
        <div className="nb-wrapper" ref={panelRef}>
            <button
                className={`nb-trigger ${unreadCount > 0 ? "nb-trigger--has-unread" : ""}`}
                onClick={() => setOpen((o) => !o)}
                title="Notifications"
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
            >
                <svg
                    className="nb-bell-icon"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                    <span className="nb-badge">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="nb-panel">
                    <div className="nb-panel-header">
                        <span className="nb-panel-title">Notifications</span>
                        {unreadCount > 0 && (
                            <button
                                className="nb-mark-all"
                                onClick={markAllRead}
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {notifications.length === 0 ? (
                        <div className="nb-empty">
                            <svg
                                width="32"
                                height="32"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                            >
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                            <span>You're all caught up!</span>
                        </div>
                    ) : (
                        <div className="nb-list">
                            {notifications.map((n) => (
                                <div
                                    key={n.id}
                                    className={`nb-item ${n.read ? "nb-item--read" : "nb-item--unread"}`}
                                    onClick={() => handleItemClick(n)}
                                >
                                    <div className="nb-item-dot" />
                                    <div
                                        className={`nb-item-icon nb-item-icon--${n.type}`}
                                    >
                                        {TYPE_ICONS[n.type] || "💬"}
                                    </div>
                                    <div className="nb-item-body">
                                        <div className="nb-item-title">
                                            {n.title}
                                        </div>
                                        <div className="nb-item-body-text">
                                            {n.body}
                                        </div>
                                        <div className="nb-item-time">
                                            {timeAgo(n.createdAt)}
                                        </div>
                                    </div>
                                    <button
                                        className="nb-item-dismiss"
                                        title="Dismiss"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            dismiss(n.id);
                                        }}
                                    >
                                        <svg
                                            width="12"
                                            height="12"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                        >
                                            <line
                                                x1="18"
                                                y1="6"
                                                x2="6"
                                                y2="18"
                                            />
                                            <line
                                                x1="6"
                                                y1="6"
                                                x2="18"
                                                y2="18"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
