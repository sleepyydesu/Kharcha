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
import KharchaBot from "./components/KharchaBot";

import { isBiometricAvailable, getSavedBiometricUser, registerBiometric } from "./hooks/useBiometric";
import { biometricRegisterApi } from "./services/api";

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
import OAuthConsent from "./pages/OAuthConsent";
import ApiDocs from "./pages/ApiDocs";
import Services from "./pages/Services";
import ServiceDetail from "./pages/ServiceDetail";
import Topup from "./pages/services/Topup";
import Internet from "./pages/services/Internet";
import Landline from "./pages/services/Landline";
import Water from "./pages/services/Water";
import Electricity from "./pages/services/Electricity";
import Education from "./pages/services/Education";
import KharchaCard from "./pages/KharchaCard";
import AdminDashboard from "./pages/AdminDashboard";

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
                @keyframes fadeIn {
                    from { opacity: 0 }
                    to { opacity: 1 }
                }

                @keyframes slideUp {
                    from {
                        transform: translateY(20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>,
        document.body,
    );
}

// Biometric setup modal shown after first password login
function BiometricSetupModal({ onDismiss }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleEnable = async () => {
        setLoading(true);
        setError("");

        try {
            const pending = window.__kharcha_pending_biometric_setup;
            if (!pending) {
                onDismiss();
                return;
            }

            const available = await isBiometricAvailable();
            if (!available) {
                setError("Biometric authentication is not available on this device.");
                return;
            }

            await registerBiometric(
                {
                    account_id:   pending.account_id,
                    email:        pending.email,
                    display_name: pending.email,
                },
                biometricRegisterApi,
            );

            // Clear pending data
            delete window.__kharcha_pending_biometric_setup;
            onDismiss();
        } catch (e) {
            console.error("Biometric setup error:", e);
            setError(e.message || "Failed to set up biometric. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        // Just clear the pending data without setting up
        delete window.__kharcha_pending_biometric_setup;
        onDismiss();
    };

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
                <div
                    style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        background: "var(--success-bg)",
                        border: "1.5px solid var(--success-border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 26,
                        margin: "0 auto 20px",
                    }}
                >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
                        <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
                        <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
                        <path d="M2 12a10 10 0 0 1 18-6" />
                        <path d="M2 17c1 .5 2.06.78 3 .87" />
                        <path d="M22 6c.18.5.33 1 .44 1.5" />
                    </svg>
                </div>

                <h2
                    style={{
                        fontSize: "18px",
                        fontWeight: 700,
                        color: "var(--text-color)",
                        margin: "0 0 8px",
                    }}
                >
                    Enable Fingerprint Login
                </h2>

                <p
                    style={{
                        fontSize: "14px",
                        color: "var(--text-sub)",
                        margin: "0 0 24px",
                        lineHeight: 1.6,
                    }}
                >
                    Use your fingerprint to quickly and securely log in without entering your password each time.
                </p>

                {error && (
                    <p style={{ color: "var(--error)", fontSize: "13px", marginBottom: "16px" }}>
                        {error}
                    </p>
                )}

                <button
                    onClick={handleEnable}
                    disabled={loading}
                    style={{
                        width: "100%",
                        padding: "12px",
                        background: "var(--primary)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "10px",
                        fontSize: "15px",
                        fontWeight: 600,
                        cursor: loading ? "not-allowed" : "pointer",
                        opacity: loading ? 0.7 : 1,
                        marginBottom: "12px",
                        letterSpacing: "0.01em",
                    }}
                >
                    {loading ? "Setting up..." : "Enable Fingerprint"}
                </button>

                <button
                    onClick={handleSkip}
                    style={{
                        width: "100%",
                        padding: "12px",
                        background: "transparent",
                        color: "var(--text-sub)",
                        border: "1px solid var(--border)",
                        borderRadius: "10px",
                        fontSize: "14px",
                        fontWeight: 500,
                        cursor: "pointer",
                    }}
                >
                    Skip for now
                </button>
            </div>
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
                                <span className="feat-icon">⚡</span>
                                Instant transfers
                            </li>

                            <li>
                                <span className="feat-icon">🔒</span>
                                Bank-grade security
                            </li>

                            <li>
                                <span className="feat-icon">📱</span>
                                Works everywhere
                            </li>

                            <li>
                                <span className="feat-icon">🇳🇵</span>
                                Made for Nepal
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
                                    className={`tab-btn ${
                                        activeTab === "login" ? "active" : ""
                                    }`}
                                    onClick={() => setActiveTab("login")}
                                >
                                    Login
                                </button>

                                <button
                                    className={`tab-btn ${
                                        activeTab === "register"
                                            ? "active"
                                            : ""
                                    }`}
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
                                <SignupForm
                                    key="signup"
                                    onLogin={onLogin}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <p className="brand-tagline">Nepal's trusted digital wallet</p>

            <p className="brand-sub">Send money. Pay bills. Stay in control.</p>

            <ul className="brand-features">
              <li>
                <span className="feat-icon">⚡</span>
                Instant transfers
              </li>

              <li>
                <span className="feat-icon">🔒</span>
                Bank-grade security
              </li>

              <li>
                <span className="feat-icon">📱</span>
                Works everywhere
              </li>

              <li>
                <span className="feat-icon">🇳🇵</span>
                Made for Nepal
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
                  className={`tab-btn ${
                    activeTab === "register" ? "active" : ""
                  }`}
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

// ── App Shell ────────────────────────────────────────────────
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
                className={`app-content${
                    isDashboard ? " app-content--has-panel" : ""
                }`}
            >
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/load" element={<LoadMoney />} />
                    <Route path="/send" element={<SendMoney />} />

                    <Route
                        path="/statements"
                        element={<Statements />}
                    />

                    <Route
                        path="/statements/:transaction_id"
                        element={<StatementDetail />}
                    />

                    <Route path="/expenses" element={<Expenses />} />
                    <Route path="/account" element={<Account />} />
                    <Route path="/set-token" element={<SetToken />} />

                    <Route
                        path="/org/qr-codes"
                        element={<OrgQRCodes />}
                    />

                    <Route
                        path="/org/dynamic-qr"
                        element={<DynamicQRPayment />}
                    />

                    <Route
                        path="/developers"
                        element={<ApiDocs />}
                    />

                    <Route path="/services" element={<Services />} />
                    <Route
                        path="/services/:type"
                        element={<ServiceDetail />}
                    />
                    <Route path="/services/topup" element={<Topup />} />
                    <Route path="/services/internet" element={<Internet />} />
                    <Route path="/services/landline" element={<Landline />} />
                    <Route path="/services/water" element={<Water />} />
                    <Route
                        path="/services/electricity"
                        element={<Electricity />}
                    />
                    <Route
                        path="/services/education"
                        element={<Education />}
                    />

                    <Route path="/card" element={<KharchaCard />} />

                    <Route
                        path="/admin"
                        element={<AdminDashboard />}
                    />
                </Routes>
            </main>
        </div>

        <QRScanner open={qrOpen} onClose={handleQrClose} />
        <KharchaBot />
    </>
);
}

// ── Root App ─────────────────────────────────────────────────
function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(
        () => localStorage.getItem("kharcha_session") === "1",
    );

    const [qrOpen, setQrOpen] = useState(false);
    const [sessionExpired, setSessionExpired] = useState(false);
    const [showBiometricSetup, setShowBiometricSetup] = useState(false);

    useEffect(() => {
        const handleExpired = () => {
            setSessionExpired(true);
        };

        window.addEventListener(
            "kharcha:session-expired",
            handleExpired,
        );

        return () =>
            window.removeEventListener(
                "kharcha:session-expired",
                handleExpired,
            );
    }, []);

    // Check for pending biometric setup after authentication
    useEffect(() => {
        if (isAuthenticated && !sessionExpired) {
            const pending = window.__kharcha_pending_biometric_setup;
            if (pending) {
                // Only show if user doesn't already have biometric set up on this device
                const existingBiometric = getSavedBiometricUser();
                if (!existingBiometric) {
                    setShowBiometricSetup(true);
                } else {
                    // Already has biometric, clear pending
                    delete window.__kharcha_pending_biometric_setup;
                }
            }
        }
    }, [isAuthenticated, sessionExpired]);

    const handleSessionDismiss = useCallback(() => {
        localStorage.removeItem("kharcha_session");
        setSessionExpired(false);
        setIsAuthenticated(false);
    }, []);

    const handleBiometricSetupDismiss = useCallback(() => {
        setShowBiometricSetup(false);
    }, []);

    useEffect(() => {
        document.body.classList.toggle(
            "app-authenticated",
            isAuthenticated,
        );
    }, [isAuthenticated]);

    return (
        <NotificationProvider>
            <BrowserRouter>
                {sessionExpired && (
                    <SessionExpiredModal
                        onDismiss={handleSessionDismiss}
                    />
                )}

                {showBiometricSetup && (
                    <BiometricSetupModal
                        onDismiss={handleBiometricSetupDismiss}
                    />
                )}

                <Routes>
                    <Route
                        path="/pay/:session_id"
                        element={<PaymentGateway />}
                    />

                    <Route
                        path="/oauth-consent"
                        element={<OAuthConsent />}
                    />

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
                                        localStorage.setItem(
                                            "kharcha_session",
                                            "1",
                                        );

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
