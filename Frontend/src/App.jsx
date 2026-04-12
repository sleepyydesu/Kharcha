import { useState, useCallback, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
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
import SetToken from "./pages/SetToken";
import OrgQRCodes from "./pages/OrgQRCodes";
import PaymentGateway from "./pages/PaymentGateway";
import ApiDocs from "./pages/ApiDocs";

// ─── CSS strategy ────────────────────────────────────────────────────────────
// index.css        → auth pages only  (loaded globally in main.jsx)
// variables.css    → app shell only   (injected dynamically when authenticated)
// App.css          → app shell only   (injected dynamically when authenticated)
// ─────────────────────────────────────────────────────────────────────────────
function injectSheet(id, href) {
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.id = id;
    document.head.appendChild(link);
}
function removeSheet(id) {
    document.getElementById(id)?.remove();
}

function useAppStyles(enabled) {
    useEffect(() => {
        if (!enabled) return;
        injectSheet("kharcha-vars", "/src/styles/variables.css");
        injectSheet("kharcha-app",  "/src/App.css");
        return () => {
            removeSheet("kharcha-vars");
            removeSheet("kharcha-app");
        };
    }, [enabled]);
}

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
                            <span className="brand-name">Khar<span>cha</span></span>
                        </div>
                        <p className="brand-tagline">Nepal's trusted digital wallet</p>
                        <p className="brand-sub">Send money. Pay bills. Stay in control.</p>
                        <ul className="brand-features">
                            <li><span className="feat-icon">⚡</span> Instant transfers</li>
                            <li><span className="feat-icon">🔒</span> Bank-grade security</li>
                            <li><span className="feat-icon">📱</span> Works everywhere</li>
                            <li><span className="feat-icon">🇳🇵</span> Made for Nepal</li>
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
                                >Login</button>
                                <button
                                    className={`tab-btn ${activeTab === "register" ? "active" : ""}`}
                                    onClick={() => setActiveTab("register")}
                                >Register</button>
                            </div>
                        )}
                        {showReset && (
                            <div className="reset-header">
                                <KharchaLogo size={32} />
                                <span className="brand-name-sm">Khar<span>cha</span></span>
                            </div>
                        )}
                        <div className="scroll-area">
                            {showReset && (
                                <ResetForm
                                    key="reset"
                                    onBack={() => { setShowReset(false); setActiveTab("login"); }}
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
                                <SignupForm
                                    key="signup"
                                    onLogin={onLogin}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

function AppShell({ qrOpen, setQrOpen }) {
    const location = useLocation();
    const isDashboard = location.pathname === "/";
    // Stable reference — prevents CameraScanner from restarting on every re-render
    const handleQrClose = useCallback(() => setQrOpen(false), [setQrOpen]);
    return (
        <>
            <div className="app-shell">
                <Sidebar onScanQR={() => setQrOpen(true)} />
                <BalancePanel dashboardOnly={!isDashboard} />
                <main
                    className={`app-content${isDashboard ? " app-content--has-panel" : ""}`}
                >
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/load" element={<LoadMoney />} />
                        <Route path="/send" element={<SendMoney />} />
                        <Route path="/statements" element={<Statements />} />
                        <Route path="/statements/:transaction_id" element={<StatementDetail />} />
                        <Route path="/account" element={<Account />} />
                        <Route path="/set-token" element={<SetToken />} />
                        <Route path="/org/qr-codes" element={<OrgQRCodes />} />
                        {/* Hosted payment page — linked externally by merchants */}
                        <Route
                            path="/pay/:session_id"
                            element={<PaymentGateway />}
                        />
                        {/* Developer API docs */}
                        <Route path="/developers" element={<ApiDocs />} />
                    </Routes>
                </main>
            </div>
            <QRScanner open={qrOpen} onClose={handleQrClose} />
        </>
    );
}

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(
        () => !!localStorage.getItem("token")
    );
    const [qrOpen, setQrOpen] = useState(false);

    // Inject app stylesheets only when the user is logged in.
    // When logged out, index.css (loaded in main.jsx) takes sole control.
    useAppStyles(isAuthenticated);

    // Keep body class in sync so index.css auth background and
    // variables.css app background never fight each other.
    useEffect(() => {
        document.body.classList.toggle("app-authenticated", isAuthenticated);
    }, [isAuthenticated]);

    if (!isAuthenticated) {
        return <AuthApp onLogin={() => setIsAuthenticated(true)} />;
    }

    return (
        <BrowserRouter>
            <AppShell qrOpen={qrOpen} setQrOpen={setQrOpen} />
        </BrowserRouter>
    );
}

export default App;
