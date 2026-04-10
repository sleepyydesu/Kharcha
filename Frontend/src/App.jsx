// App.jsx
// Kharcha – Desktop-first layout.
//
// Layout structure:
//   <page-wrapper>          ← full viewport, dark green bg + bubbles
//     <auth-container>      ← centered card, two columns side by side
//       <brand-panel>       ← LEFT: logo, tagline, decorative art (green bg)
//       <form-panel>        ← RIGHT: tab bar + form (white bg)
//
// Responsive behaviour:
//   ≥ 900px  → two columns side by side (desktop)
//   < 900px  → brand panel stacks on top, form below (tablet)
//   < 600px  → brand panel becomes a compact header strip (mobile)

import { useState } from "react";
import { createPortal } from "react-dom";
import KharchaLogo from "./components/KharchaLogo";
import LoginForm from "./components/LoginForm";
import SignupForm from "./components/SignupForm";
import ResetForm from "./components/ResetForm";

// ── Bubble portal ─────────────────────────────────────────────
// Injected straight into <body> so z-index stacking never clips them.
function BubblePortal() {
  return createPortal(
    <div className="bubble-layer" aria-hidden="true">
      {[...Array(12)].map((_, i) => (
        <div key={i} className={`bubble bubble-${i + 1}`} />
      ))}
    </div>,
    document.body,
  );
}

// ── Main App ──────────────────────────────────────────────────
function App() {
  const [activeTab, setActiveTab] = useState("login");
  const [showReset, setShowReset] = useState(false);

  return (
    <>
      <BubblePortal />

      {/* Full-viewport wrapper – centres the card */}
      <div className="page-wrapper">
        {/* The auth card – two panels side by side on desktop */}
        <div className="auth-container">
          {/* ── LEFT: Brand panel ───────────────────── */}
          <div className="brand-panel">
            {/* Logo */}
            <div className="brand-logo-row">
              <KharchaLogo size={52} />
              <span className="brand-name">
                Khar<span>cha</span>
              </span>
            </div>

            {/* Tagline */}
            <p className="brand-tagline">Nepal's trusted digital wallet</p>
            <p className="brand-sub">Send money. Pay bills. Stay in control.</p>

            {/* Decorative feature list */}
            <ul className="brand-features">
              <li>
                <span className="feat-icon">⚡</span> Instant transfers
              </li>
              <li>
                <span className="feat-icon">🔒</span> Bank-grade security
              </li>
              <li>
                <span className="feat-icon">📱</span> Works everywhere
              </li>
              <li>
                <span className="feat-icon">🇳🇵</span> Made for Nepal
              </li>
            </ul>

            {/* Decorative circles (mirrors the header bubbles) */}
            <div className="brand-deco-circle brand-deco-1" />
            <div className="brand-deco-circle brand-deco-2" />
            <div className="brand-deco-circle brand-deco-3" />
          </div>

          {/* ── RIGHT: Form panel ───────────────────── */}
          <div className="form-panel">
            {/* Tab bar – hidden when Reset page is shown */}
            {!showReset && (
              <div className="tab-bar">
                <button
                  className={`tab-btn ${activeTab === "login" ? "active" : ""}`}
                  onClick={() => setActiveTab("login")}
                >
                  Login
                </button>
                <button
                  className={`tab-btn ${activeTab === "register" ? "active" : ""}`}
                  onClick={() => setActiveTab("register")}
                >
                  Register
                </button>
              </div>
            )}

            {/* Reset page heading */}
            {showReset && (
              <div className="reset-header">
                <KharchaLogo size={32} />
                <span className="brand-name-sm">
                  Khar<span>cha</span>
                </span>
              </div>
            )}

            {/* Scrollable form content */}
            <div className="scroll-area">
              {showReset && (
                <ResetForm
                  key="reset"
                  onBack={() => {
                    setShowReset(false);
                    setActiveTab("login");
                  }}
                />
              )}
              {!showReset && activeTab === "login" && (
                <LoginForm key="login" onShowReset={() => setShowReset(true)} />
              )}
              {!showReset && activeTab === "register" && (
                <SignupForm key="signup" />
              )}
            </div>
          </div>
          {/* end form-panel */}
        </div>
        {/* end auth-container */}
      </div>
      {/* end page-wrapper */}
    </>
  );
}

export default App;
