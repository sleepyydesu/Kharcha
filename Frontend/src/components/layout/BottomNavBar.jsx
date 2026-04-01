import React from "react";
import { Home, FileText, QrCode, HelpCircle, Receipt } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import "./BottomNavBar.css";

const leftItems = [
  { id: "home", label: "Home", icon: Home, route: "/" },
  { id: "statement", label: "Statement", icon: FileText, route: "/statement" },
];

const rightItems = [
  { id: "support", label: "Support", icon: HelpCircle, route: "/support" },
  { id: "expenses", label: "Expenses", icon: Receipt, route: "/expenses" },
];

export default function BottomNavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="bottom-nav-wrapper">
      {/* QR floating above navbar */}
      <button className="qr-float-btn" onClick={() => navigate("/qr")}>
        <QrCode size={26} color="#1A1A1A" strokeWidth={2} />
      </button>

      <div className="bottom-nav">
        {/* LEFT side */}
        {leftItems.map((item) => {
          const isActive = location.pathname === item.route;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? "nav-active" : ""}`}
              onClick={() => navigate(item.route)}
            >
              <item.icon
                size={22}
                color={isActive ? "#1E5C38" : "#5a4e00"}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}

        {/* CENTER empty space for QR */}
        <div className="qr-placeholder" />

        {/* RIGHT side */}
        {rightItems.map((item) => {
          const isActive = location.pathname === item.route;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? "nav-active" : ""}`}
              onClick={() => navigate(item.route)}
            >
              <item.icon
                size={22}
                color={isActive ? "#1E5C38" : "#5a4e00"}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
