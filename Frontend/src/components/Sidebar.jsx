import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Sidebar.css";

import homeIcon        from "../assets/homeIcon.svg";
import servicesIcon    from "../assets/servicesIcon.svg";
import walletIcon      from "../assets/walletIcon.svg";
import walletLoadIcon  from "../assets/walletLoadIcon.svg";
import walletSendIcon  from "../assets/walletSendIcon.svg";
import bankIcon        from "../assets/bankIcon.svg";
import statementsIcon  from "../assets/transactionHistoryIcon.svg";
import accountIcon     from "../assets/accountIcon.svg";
import electricityIcon from "../assets/electricityIcon.svg";
import internetIcon    from "../assets/internetIcon.svg";
import topupIcon       from "../assets/topupIcon.svg";

function QRIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3"  y="3"  width="7" height="7" rx="1"/>
      <rect x="14" y="3"  width="7" height="7" rx="1"/>
      <rect x="3"  y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="3" height="3"/>
      <rect x="17" y="17" width="3" height="3"/>
      <line x1="17" y1="14" x2="20" y2="14"/>
      <line x1="20" y1="14" x2="20" y2="17"/>
    </svg>
  );
}

function Chevron() {
  return (
    <svg className="chevron" width="15" height="15" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [servicesOpen, setServicesOpen] = useState(false);
  const [walletOpen,   setWalletOpen]   = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(null);

  const at = (p) => location.pathname === p;

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar__logo">
          <span className="sidebar__logo-text">Kharcha</span>
        </div>

        <nav className="sidebar__menu">
          <button className={`sidebar__item ${at("/") ? "sidebar__item--active" : ""}`}
            onClick={() => navigate("/")}>
            <img src={homeIcon} className="sidebar__icon" alt="" />
            <span>Dashboard</span>
          </button>

          <div className="sidebar__group">
            <button className={`sidebar__item ${servicesOpen ? "sidebar__item--open" : ""}`}
              onClick={() => setServicesOpen(o => !o)}>
              <img src={servicesIcon} className="sidebar__icon" alt="" />
              <span>Services</span>
              <Chevron />
            </button>
            {servicesOpen && (
              <div className="sidebar__dropdown">
                <button className="sidebar__child"><img src={electricityIcon} className="sidebar__icon sidebar__icon--sm" alt="" />Electricity</button>
                <button className="sidebar__child"><img src={internetIcon}    className="sidebar__icon sidebar__icon--sm" alt="" />Internet</button>
                <button className="sidebar__child"><img src={topupIcon}       className="sidebar__icon sidebar__icon--sm" alt="" />Topup</button>
              </div>
            )}
          </div>

          <div className="sidebar__group">
            <button className={`sidebar__item ${walletOpen ? "sidebar__item--open" : ""}`}
              onClick={() => setWalletOpen(o => !o)}>
              <img src={walletIcon} className="sidebar__icon" alt="" />
              <span>Wallet</span>
              <Chevron />
            </button>
            {walletOpen && (
              <div className="sidebar__dropdown">
                <button className="sidebar__child" onClick={() => navigate("/load")}><img src={walletLoadIcon} className="sidebar__icon sidebar__icon--sm" alt="" />Load Wallet</button>
                <button className="sidebar__child"><img src={walletSendIcon} className="sidebar__icon sidebar__icon--sm" alt="" />Send Money</button>
                <button className="sidebar__child"><img src={bankIcon}       className="sidebar__icon sidebar__icon--sm" alt="" />Bank Transfer</button>
              </div>
            )}
          </div>

          <button className={`sidebar__item ${at("/statements") ? "sidebar__item--active" : ""}`}
            onClick={() => navigate("/statements")}>
            <img src={statementsIcon} className="sidebar__icon" alt="" />
            <span>Statements</span>
          </button>

          <button className={`sidebar__item ${at("/account") ? "sidebar__item--active" : ""}`}
            onClick={() => navigate("/account")}>
            <img src={accountIcon} className="sidebar__icon" alt="" />
            <span>Account</span>
          </button>
        </nav>

        <button className="sidebar__qr" onClick={() => navigate("/qr")}>
          <QRIcon size={20} />
          <span>Scan QR</span>
        </button>
      </aside>

      {/* ── Mobile Bottom Nav ────────────────────────────── */}
      <nav className="bottom-nav">

        <button className={`bnav__item ${at("/") ? "bnav__item--active" : ""}`}
          onClick={() => { setMobileOpen(null); navigate("/"); }}>
          <img src={homeIcon} className="bnav__icon" alt="" />
          <span className="bnav__label">Home</span>
        </button>

        <button className={`bnav__item ${at("/statements") ? "bnav__item--active" : ""}`}
          onClick={() => { setMobileOpen(null); navigate("/statements"); }}>
          <img src={statementsIcon} className="bnav__icon" alt="" />
          <span className="bnav__label">Statements</span>
        </button>

        {/* QR — centred, no label */}
        <div className="bnav__qr-wrap">
          <button className={`bnav__qr ${at("/qr") ? "bnav__qr--active" : ""}`}
            onClick={() => { setMobileOpen(null); navigate("/qr"); }} aria-label="Scan QR">
            <QRIcon size={26} />
          </button>
        </div>

        <div className="bnav__item-wrap">
          <button className={`bnav__item ${location.pathname.startsWith("/services") ? "bnav__item--active" : ""}`}
            onClick={() => { setMobileOpen(null); navigate("/services"); }}>
            <img src={servicesIcon} className="bnav__icon" alt="" />
            <span className="bnav__label">Services</span>
          </button>
        </div>

        <button className={`bnav__item ${at("/account") ? "bnav__item--active" : ""}`}
          onClick={() => { setMobileOpen(null); navigate("/account"); }}>
          <img src={accountIcon} className="bnav__icon" alt="" />
          <span className="bnav__label">Account</span>
        </button>

      </nav>
    </>
  );
}