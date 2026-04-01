import React from "react";
import { Bell } from "lucide-react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BalanceCard from "../components/home/BalanceCard";
import QuickActions from "../components/home/QuickActions";
import RecentTransactions from "../components/home/RecentTransactions";
import BottomNavBar from "../components/layout/BottomNavBar";
import klogo from "../assets/klogo.png";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-wrapper">
      {/* HEADER */}
      <div className="home-header">
        <div className="header-left">
          <div className="k-logo">
            <img src={klogo} alt="Kharcha Logo" />
          </div>
          <div>
            <p className="hi-text">Hi !</p>
            <p className="user-text">User</p>
          </div>
        </div>
        <div className="header-right">
          <button className="header-icon-btn">
            <Bell size={22} color="white" strokeWidth={1.5} />
          </button>
          <div className="header-avatar">U</div>
        </div>
      </div>

      {/* SEARCH */}
      <div className="search-wrapper">
        <div className="search-bar">
          <Search size={16} color="#999" />
          <input type="text" placeholder="Search" className="search-input" />
        </div>
      </div>

      {/* CONTENT */}
      <div className="home-content">
        <BalanceCard />
        <QuickActions />
        <RecentTransactions />
      </div>

      {/* BOTTOM NAV */}
      <BottomNavBar />
    </div>
  );
}
