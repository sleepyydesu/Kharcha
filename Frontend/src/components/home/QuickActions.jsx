import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import "./QuickActions.css";

/* 🔥 IMPORT YOUR CUSTOM ICONS */
import sendIcon from "../../assets/walletSendIcon.svg";
import loadIcon from "../../assets/topupIcon.svg";
import expenseIcon from "../../assets/walletIcon.svg";
import bankIcon from "../../assets/bankIcon.svg";

import topupIcon from "../../assets/topupIcon.svg";
import waterIcon from "../../assets/waterIcon.svg";
import educationIcon from "../../assets/educationIcon.svg";
import electricityIcon from "../../assets/electricityIcon.svg";
import landlineIcon from "../../assets/landlineIcon.svg";
import internetIcon from "../../assets/internetIcon.svg";

export default function QuickActions() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  // ✅ UPDATED TOP ACTIONS (ONLY ICON CHANGED)
  const topActions = [
    { name: "Send", icon: sendIcon, path: "/send" },
    { name: "Load", icon: loadIcon, path: "/load" },
    { name: "Expenses", icon: expenseIcon, path: "/expenses" },
    { name: "Bank", icon: bankIcon, path: "/bank-transfer" },
  ];

  // ✅ SERVICES (ONLY ICON CHANGED)
  const services = [
    { name: "Topup", icon: topupIcon, path: "/topup" },
    { name: "Water", icon: waterIcon, path: "/bills/water" },
    {
      name: "Education",
      icon: educationIcon,
      path: "/bills/education",
    },
    {
      name: "Electricity",
      icon: electricityIcon,
      path: "/bills/electricity",
    },
    { name: "Landline", icon: landlineIcon },
    {
      name: "Internet/TV",
      icon: internetIcon,
      path: "/bills/internet-tv",
    },
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
            <img src={item.icon} alt={item.name} className="quick-img" />
            <p>{item.name}</p>
          </div>
        ))}
      </div>

      {/* 🔥 SERVICES */}
      <div className={`quick-grid ${expanded ? "expanded" : ""}`}>
        {(expanded ? services : services.slice(0, 4)).map((item, i) => (
          <div
            key={i}
            className="quick-item secondary"
            onClick={() => item.path && navigate(item.path)}
          >
            <img src={item.icon} alt={item.name} className="quick-img small" />
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
