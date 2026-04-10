import React from "react";
import { Home, FileText, QrCode, Layers, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./BottomNavBar.css";

export default function BottomNavBar() {
  const navigate = useNavigate();

  return (
    <div className="nav-bar">
      {/* LEFT */}
      <div className="nav-item" onClick={() => navigate("/")}>
        <Home size={22} />
        <p>Home</p>
      </div>

      <div className="nav-item" onClick={() => navigate("/statements")}>
        <FileText size={22} />
        <p>Statements</p>
      </div>

      {/* 🔥 CENTER QR BUTTON */}
      <div className="qr-btn" onClick={() => navigate("/qr")}>
        <QrCode size={26} />
      </div>

      {/* RIGHT */}
      <div className="nav-item" onClick={() => navigate("/services")}>
        <Layers size={22} />
        <p>Services</p>
      </div>

      <div className="nav-item" onClick={() => navigate("/account")}>
        <User size={22} />
        <p>Account</p>
      </div>
    </div>
  );
}
