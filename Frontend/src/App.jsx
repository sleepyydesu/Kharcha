import { useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
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
import "./styles/variables.css";
import "./App.css";

function AppShell({ qrOpen, setQrOpen }) {
    const location = useLocation();
    const isDashboard = location.pathname === "/";
    return (
        <>
            <div className="app-shell">
                <Sidebar onScanQR={() => setQrOpen(true)} />
                <BalancePanel dashboardOnly={!isDashboard} />
                <main className={`app-content${isDashboard ? " app-content--has-panel" : ""}`}>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/load" element={<LoadMoney />} />
                        <Route path="/send" element={<SendMoney />} />
                        <Route path="/statements" element={<Statements />} />
                        <Route
                            path="/statements/:transaction_id"
                            element={<StatementDetail />}
                        />
                        <Route path="/account" element={<Account />} />
                        <Route path="/set-token" element={<SetToken />} />
                    </Routes>
                </main>
            </div>

            {/* QR Scanner — portal overlay, renders above everything */}
            <QRScanner open={qrOpen} onClose={() => setQrOpen(false)} />
        </>
    );
}

function App() {
    const [qrOpen, setQrOpen] = useState(false);
    return (
        <BrowserRouter>
            <AppShell qrOpen={qrOpen} setQrOpen={setQrOpen} />
        </BrowserRouter>
    );
}

export default App;