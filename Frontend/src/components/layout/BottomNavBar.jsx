import React from "react";
import { Home, FileText, Receipt, User, QrCode } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import "./BottomNavBar.css";

const navItems = [
  { id: "home", label: "Home", icon: Home, route: "/" },
  {
    id: "statements",
    label: "Statements",
    icon: FileText,
    route: "/statement",
  },
  {
    id: "expenses",
    label: "Expenses",
    icon: Receipt,
    route: "/expenses",
  },
  {
    id: "account",
    label: "Account",
    icon: User,
    route: "/account",
  },
];

export default function BottomNavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="bottom-nav-wrapper">
      {/* NAV BAR */}
      <div className="bottom-nav">
        <div className="nav-inner">
          {/* QR BUTTON */}
          <button className="qr-float-btn" onClick={() => navigate("/qr")}>
            <QrCode size={26} strokeWidth={2} />
          </button>

          {navItems.map((item, index) => {
            const isActive = location.pathname === item.route;

            // Center gap for QR
            if (index === 2) {
              return (
                <React.Fragment key="qr-space">
                  <div className="qr-placeholder" />

                  <button
                    key={item.id}
                    className={`nav-item ${isActive ? "nav-active" : ""}`}
                    onClick={() => navigate(item.route)}
                  >
                    <item.icon size={22} />
                    <span>{item.label}</span>
                  </button>
                </React.Fragment>
              );
            }

            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? "nav-active" : ""}`}
                onClick={() => navigate(item.route)}
              >
                <item.icon size={22} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
