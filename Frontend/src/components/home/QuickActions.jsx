import React from "react";
import { useNavigate } from "react-router-dom";
import "./QuickActions.css";

const actions = [
  { label: "Load", icon: "⬇️", route: "/load" },
  { label: "Send", icon: "⬆️", route: "/send" },
  { label: "Bills", icon: "🧾", route: "/bills" },
];

export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="quick-actions-card">
      {actions.map((action) => (
        <button
          key={action.label}
          className="action-item"
          onClick={() => navigate(action.route)}
        >
          <span className="action-icon">{action.icon}</span>
          <span className="action-label">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
