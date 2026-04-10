import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "./Services.css";

/* 🔥 IMPORT YOUR ICONS */
import topupIcon from "../assets/topupIcon.svg";
import waterIcon from "../assets/waterIcon.svg";
import educationIcon from "../assets/educationIcon.svg";
import electricityIcon from "../assets/electricityIcon.svg";
import landlineIcon from "../assets/landlineIcon.svg";
import internetIcon from "../assets/internetIcon.svg";

export default function Services() {
  const navigate = useNavigate();

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
    <div className="services-wrapper">
      {/* HEADER */}
      <div className="services-header">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <h2>Services</h2>
        <div />
      </div>

      {/* GRID */}
      <div className="services-grid">
        {services.map((item, i) => (
          <div
            key={i}
            className="service-card"
            onClick={() => item.path && navigate(item.path)}
          >
            <img src={item.icon} alt={item.name} className="service-icon" />
            <p>{item.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
