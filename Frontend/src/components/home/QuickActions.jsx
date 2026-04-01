import React from "react";
import {
  Download,
  Upload,
  Landmark,
  Smartphone,
  Droplets,
  GraduationCap,
  Zap,
  MoreHorizontal,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./QuickActions.css";

const row1 = [
  { label: "Load", icon: Download, route: "/load" },
  { label: "Send", icon: Upload, route: "/send" },
  { label: "Bank\nTransfer", icon: Landmark, route: "/bank-transfer" },
  { label: "Top up", icon: Smartphone, route: "/topup" },
];

const row2 = [
  { label: "Water", icon: Droplets, route: "/bills/water" },
  { label: "Education", icon: GraduationCap, route: "/bills/education" },
  { label: "Electricity", icon: Zap, route: "/bills/electricity" },
  { label: "More", icon: MoreHorizontal, route: "/more" },
];

function ActionItem({ label, icon: Icon, route }) {
  const navigate = useNavigate();

  return (
    <button className="action-item" onClick={() => navigate(route)}>
      <Icon size={26} strokeWidth={1.5} color="#1A1A1A" />
      <span className="action-label">{label}</span>
    </button>
  );
}

export default function QuickActions() {
  return (
    <>
      <div className="quick-actions-card">
        {row1.map((item) => (
          <ActionItem key={item.label} {...item} />
        ))}
      </div>
      <div className="quick-actions-card">
        {row2.map((item) => (
          <ActionItem key={item.label} {...item} />
        ))}
      </div>
    </>
  );
}
