import { useState, useCallback, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";

import "./styles/variables.css";
import "./App.css";

import { NotificationProvider } from "./context/NotificationContext";
import NotificationToast from "./components/NotificationToast";
import KharchaLogo from "./components/KharchaLogo";
import LoginForm from "./components/LoginForm";
import SignupForm from "./components/SignupForm";
import ResetForm from "./components/ResetForm";
import Sidebar from "./components/Sidebar";
import BalancePanel from "./components/BalancePanel";
import QRScanner from "./components/QRScanner";

import Dashboard from "./pages/Dashboard";
import LoadMoney from "./pages/LoadMoney";
import SendMoney from "./pages/SendMoney";
import Statements from "./pages/Statements";
import StatementDetail from "./pages/StatementDetail";
import Account from "./pages/Account";
import Expenses from "./pages/Expenses";
import SetToken from "./pages/SetToken";
import OrgQRCodes from "./pages/OrgQRCodes";
import DynamicQRPayment from "./pages/DynamicQRPayment";
import PaymentGateway from "./pages/PaymentGateway";
import ApiDocs from "./pages/ApiDocs";
import Services from "./pages/Services";
import KharchaCard from "./pages/KharchaCard";

// ── Bubble Background (Auth only) ─────────────────────────────
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

// ── Session Expired Modal ─────────────────────────────────────
function SessionExpiredModal({ onDismiss }) {
    return createPortal(
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
                animation: "fadeIn 0.2s ease",
            }}
        >
            <div
                style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
                    padding: "36px 32px 28px",
                    maxWidth: "380px",
                    width: "90%",
                    textAlign: "center",
                    animation: "slideUp 0.25s ease",
                }}
            >
                {/* Icon */}
                <div
                    style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        background: "var(--warning-bg)",
                        border: "1.5px solid var(--warning-border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 26,
                        margin: "0 auto 18px",
                    }}
                >
                    🔒
                </div>

                <h2
                    style={{
                        fontSize: "18px",
                        fontWeight: 700,
                        color: "var(--text-color)",
                        margin: "0 0 8px",
                    }}
                >
                    Session Expired
                </h2>

                <p
                    style={{
                        fontSize: "14px",
                        color: "var(--text-sub)",
                        margin: "0 0 24px",
                        lineHeight: 1.6,
                    }}
                >
                    Your session has expired for security. Please sign in again
                    to continue.
                </p>

                <button
                    onClick={onDismiss}
                    style={{
                        width: "100%",
                        padding: "12px",
                        background: "var(--primary)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "10px",
                        fontSize: "15px",
                        fontWeight: 600,
                        cursor: "pointer",
                        letterSpacing: "0.01em",
                    }}
                >
                    Sign in again
                </button>
            </div>

            <style>{`
                @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
            `}</style>
        </div>,
        document.body,
    );
}

// ── Auth App ─────────────────────────────────────────────────
function AuthApp({ onLogin }) {
    const [activeTab, setActiveTab] = useState("login");
    const [showReset, setShowReset] = useState(false);

    return (
        <>
            <BubblePortal />
            <div className="page-wrapper">
                <div className="auth-container">
                    <div className="brand-panel">
                        <div className="brand-logo-row">
                            <KharchaLogo size={52} />
                            <span className="brand-name">
                                Khar<span>cha</span>
                            </span>
                        </div>

                        <p className="brand-tagline">
                            Nepal's trusted digital wallet
                        </p>
                        <p className="brand-sub">
                            Send money. Pay bills. Stay in control.
                        </p>

                        <ul className="brand-features">
                            <li>
                                <span className="feat-icon">⚡</span> Instant
                                transfers
                            </li>
                            <li>
                                <span className="feat-icon">🔒</span> Bank-grade
                                security
                            </li>
                            <li>
                                <span className="feat-icon">📱</span> Works
                                everywhere
                            </li>
                            <li>
                                <span className="feat-icon">🇳🇵</span> Made for
                                Nepal
                            </li>
                        </ul>

                        <div className="brand-deco-circle brand-deco-1" />
                        <div className="brand-deco-circle brand-deco-2" />
                        <div className="brand-deco-circle brand-deco-3" />
                    </div>

                    <div className="form-panel">
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

                        {showReset && (
                            <div className="reset-header">
                                <KharchaLogo size={32} />
                                <span className="brand-name-sm">
                                    Khar<span>cha</span>
                                </span>
                            </div>
                        )}

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
                                <LoginForm
                                    key="login"
                                    onLogin={onLogin}
                                    onShowReset={() => setShowReset(true)}
                                />
                            )}

                            {!showReset && activeTab === "register" && (
                                <SignupForm key="signup" onLogin={onLogin} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// ── App Shell (authenticated) ────────────────────────────────
function AppShell({ qrOpen, setQrOpen }) {
    const location = useLocation();
    const isDashboard = location.pathname === "/";

    const handleQrClose = useCallback(() => {
        setQrOpen(false);
    }, [setQrOpen]);

    return (
        <>
            <div className="app-shell">
                <Sidebar onScanQR={() => setQrOpen(true)} />
                <BalancePanel dashboardOnly={!isDashboard} />
                <NotificationToast />

                <main
                    className={`app-content${isDashboard ? " app-content--has-panel" : ""}`}
                >
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/load" element={<LoadMoney />} />
                        <Route path="/send" element={<SendMoney />} />
                        <Route path="/statements" element={<Statements />} />
                        <Route
                            path="/statements/:transaction_id"
                            element={<StatementDetail />}
                        />
                        <Route path="/expenses" element={<Expenses />} />
                        <Route path="/account" element={<Account />} />
                        <Route path="/set-token" element={<SetToken />} />
                        <Route path="/org/qr-codes" element={<OrgQRCodes />} />
                        <Route
                            path="/org/dynamic-qr"
                            element={<DynamicQRPayment />}
                        />
                        <Route path="/developers" element={<ApiDocs />} />
                        <Route path="/services" element={<Services />} />
                        <Route path="/card" element={<KharchaCard />} />
                    </Routes>
                </main>
            </div>

            <QRScanner open={qrOpen} onClose={handleQrClose} />
        </>
    );
}

// ── Root App ─────────────────────────────────────────────────
function App() {
    // Auth state is driven by a lightweight session flag in localStorage.
    // The actual credential is the httpOnly cookie — JS never touches it.
    // "kharcha_session" = "1" just means "the user successfully logged in
    // during this browser profile"; the server is the real authority.
    const [isAuthenticated, setIsAuthenticated] = useState(
        () => localStorage.getItem("kharcha_session") === "1",
    );
    const [qrOpen, setQrOpen] = useState(false);
    const [sessionExpired, setSessionExpired] = useState(false);

    // Listen for the global session-expired event fired by services/api.js
    // when a refresh token attempt fails (idle timeout or 7-day expiry).
    useEffect(() => {
        const handleExpired = () => {
            setSessionExpired(true);
        };
        window.addEventListener("kharcha:session-expired", handleExpired);
        return () =>
            window.removeEventListener("kharcha:session-expired", handleExpired);
    }, []);

    const handleSessionDismiss = useCallback(() => {
        localStorage.removeItem("kharcha_session");
        setSessionExpired(false);
        setIsAuthenticated(false);
    }, []);

    useEffect(() => {
        document.body.classList.toggle("app-authenticated", isAuthenticated);
    }, [isAuthenticated]);

    return (
        <NotificationProvider>
            <BrowserRouter>
                {/* Session-expired modal sits above everything */}
                {sessionExpired && (
                    <SessionExpiredModal onDismiss={handleSessionDismiss} />
                )}

                <Routes>
                    {/*
                     * ── Standalone Payment Portal ────────────────────────────
                     * Completely outside auth — no sidebar, no balance panel.
                     * Uses its own OTP-based login, not the JWT system.
                     */}
                    <Route
                        path="/pay/:session_id"
                        element={<PaymentGateway />}
                    />

                    {/*
                     * ── Everything else ──────────────────────────────────────
                     * Protected by JWT auth.
                     */}
                    <Route
                        path="/*"
                        element={
                            isAuthenticated ? (
                                <AppShell
                                    qrOpen={qrOpen}
                                    setQrOpen={setQrOpen}
                                />
                            ) : (
                                <AuthApp
                                    onLogin={() => {
                                        localStorage.setItem("kharcha_session", "1");
                                        setIsAuthenticated(true);
                                    }}
                                />
                            )
                        }
                    />
                </Routes>
            </BrowserRouter>
        </NotificationProvider>
    );
}

export default App;
