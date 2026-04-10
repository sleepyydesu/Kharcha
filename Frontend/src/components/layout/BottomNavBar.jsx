import React from "react";
import { Home, FileText, QrCode, HelpCircle, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./BottomNavBar.css";

export default function BottomNavBar() {
  const navigate = useNavigate();

  return (
    <div className="nav-bar">
      <Home onClick={() => navigate("/")} />
      <FileText onClick={() => navigate("/statements")} />

      <div className="qr-btn" onClick={() => navigate("/qr")}>
        <QrCode />
      </div>

      <HelpCircle />
      <User />
    </div>
  );
}
