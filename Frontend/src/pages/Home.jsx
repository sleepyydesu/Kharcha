import React, { useEffect, useState } from "react";
import { Bell, Search } from "lucide-react";

import BalanceCard from "../components/home/BalanceCard";
import QuickActions from "../components/home/QuickActions";
import RecentTransactions from "../components/home/RecentTransactions";
import BottomNavBar from "../components/layout/BottomNavBar";

import { getTransactions } from "../api/transaction";
import { getProfile } from "../api/profile";

import klogo from "../assets/KharchaLogo.svg";
import "./Home.css";

export default function Home() {
  const [transactions, setTransactions] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [txnData, profileData] = await Promise.all([
        getTransactions(),
        getProfile(),
      ]);

      setTransactions(txnData);
      setUser(profileData);
    } catch (err) {
      console.error(err);

      if (err.response?.status === 401) {
        console.log("Unauthorized → redirect to login later");
      }
    }
  };

  return (
    <div className="home-wrapper">
      {/* ================= HEADER ================= */}
      <header className="home-header">
        <div className="container header-container">
          <div className="header-left">
            <div className="k-logo">
              <img src={klogo} alt="Kharcha Logo" />
            </div>

            <div className="header-text">
              <p className="hi-text">Hi!</p>
              <p className="user-text">{user?.full_name || "User"}</p>
            </div>
          </div>

          <div className="header-right">
            <button className="header-icon-btn">
              <Bell size={22} color="white" strokeWidth={1.5} />
            </button>

            <div className="header-avatar">
              {user?.profile_picture_url ? (
                <img
                  src={user.profile_picture_url}
                  alt="profile"
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                  }}
                />
              ) : (
                user?.full_name?.charAt(0).toUpperCase() || "U"
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ================= SEARCH ================= */}
      <section className="search-wrapper">
        <div className="container">
          <div className="search-bar">
            <Search size={16} color="#999" />
            <input type="text" placeholder="Search" className="search-input" />
          </div>
        </div>
      </section>

      {/* ================= MAIN CONTENT ================= */}
      <main className="home-content">
        <div className="container">
          <BalanceCard />
          <QuickActions />
          <RecentTransactions transactions={transactions.slice(0, 5)} />
        </div>
      </main>

      {/* ================= BOTTOM NAV ================= */}
      <BottomNavBar />
    </div>
  );
}
