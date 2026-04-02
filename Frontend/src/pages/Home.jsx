import React from "react";
import { Bell, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import BalanceCard from "../components/home/BalanceCard";
import QuickActions from "../components/home/QuickActions";
import RecentTransactions from "../components/home/RecentTransactions";
import BottomNavBar from "../components/layout/BottomNavBar";

import klogo from "../assets/KharchaLogo.svg";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-wrapper">
      {/* ================= HEADER ================= */}
      <header className="home-header">
        <div className="header-left">
          <div className="k-logo">
            <img src={klogo} alt="Kharcha Logo" />
          </div>

          <div className="header-text">
            <p className="hi-text">Hi!</p>
            <p className="user-text">User</p>
          </div>
        </div>

        <div className="header-right">
          <button className="header-icon-btn">
            <Bell size={22} color="white" strokeWidth={1.5} />
          </button>

          <div className="header-avatar">U</div>
        </div>
      </header>

      {/* ================= SEARCH ================= */}
      <section className="search-wrapper">
        <div className="search-bar">
          <Search size={16} color="#999" />
          <input type="text" placeholder="Search" className="search-input" />
        </div>
      </section>

      {/* ================= MAIN CONTENT ================= */}
      <main className="home-content">
        <BalanceCard />
        <QuickActions />
        <RecentTransactions />
      </main>

      {/* ================= BOTTOM NAV ================= */}
      <BottomNavBar />
    </div>
  );
}
