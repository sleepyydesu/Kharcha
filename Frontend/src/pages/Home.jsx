import React from "react";
import BalanceCard from "../components/home/BalanceCard";
import QuickActions from "../components/home/QuickActions";
import RecentTransactions from "../components/home/RecentTransactions";
import "./Home.css";

export default function Home() {
  return (
    <div className="home-wrapper">
      {/* HEADER */}
      <div className="home-header">
        <div className="header-left">
          <div className="logo">K</div>
          <div>
            <p className="greeting">Hi !</p>
            <p className="username">User</p>
          </div>
        </div>
        <div className="header-right">
          <button className="icon-btn">🔔</button>
          <div className="avatar">U</div>
        </div>
      </div>

      {/* SEARCH */}
      <div className="search-wrapper">
        <div className="search-bar">
          <span>🔍</span>
          <input type="text" placeholder="Search" className="search-input" />
        </div>
      </div>

      {/* CONTENT */}
      <div className="home-content">
        <BalanceCard />
        <QuickActions />
        <RecentTransactions />
      </div>
    </div>
  );
}
