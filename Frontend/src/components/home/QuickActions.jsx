import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send,
  PlusCircle,
  QrCode,
  Smartphone,
  Landmark,
  Droplet,
  GraduationCap,
  Zap,
  Phone,
  Globe,
  Wallet, // ✅ ADDED
  MoreHorizontal,
} from "lucide-react";
import "./QuickActions.css";

export default function QuickActions() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  // 🔹 TOP ACTIONS
  const topActions = [
    { name: "Send", icon: <Send size={22} />, path: "/send" },
    { name: "Load", icon: <PlusCircle size={22} />, path: "/load" },
    { name: "Scan", icon: <QrCode size={22} />, path: "/qr" },
    { name: "Topup", icon: <Smartphone size={22} />, path: "/topup" },
  ];

  // 🔹 SERVICES (UPDATED ORDER ✅)
  const services = [
    { name: "Bank", icon: <Landmark size={20} /> },
    { name: "Expenses", icon: <Wallet size={20} /> }, // ✅ ADDED (2nd position)
    { name: "Water", icon: <Droplet size={20} /> },
    { name: "Education", icon: <GraduationCap size={20} /> },
    { name: "Electricity", icon: <Zap size={20} /> },
    { name: "Landline", icon: <Phone size={20} /> },
    { name: "Internet/TV", icon: <Globe size={20} /> },
  ];

  return (
    <div className="quick-wrapper">
      {/* 🔥 TOP ROW */}
      <div className="quick-row">
        {topActions.map((item, i) => (
          <div
            key={i}
            className="quick-item primary"
            onClick={() => navigate(item.path)}
          >
            <div className="quick-icon">{item.icon}</div>
            <p>{item.name}</p>
          </div>
        ))}
      </div>

      {/* 🔥 SERVICES GRID */}
      <div className={`quick-grid ${expanded ? "expanded" : ""}`}>
        {(expanded ? services : services.slice(0, 4)).map((item, i) => (
          <div key={i} className="quick-item secondary">
            <div className="quick-icon small">{item.icon}</div>
            <p>{item.name}</p>
          </div>
        ))}

        {/* MORE BUTTON */}
        <div className="quick-item more" onClick={() => setExpanded(!expanded)}>
          <div className="quick-icon small">
            <MoreHorizontal size={20} />
          </div>
          <p>{expanded ? "Less" : "More"}</p>
        </div>
      </div>
    </div>
  );
}
