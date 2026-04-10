import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import BalancePanel from "./components/BalancePanel";
import Dashboard from "./pages/Dashboard";
import LoadMoney from "./pages/LoadMoney";
import "./styles/variables.css";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />

        {/* Always-visible balance panel — fixed right on desktop, fixed top on mobile */}
        <BalancePanel />

        <main className="app-content">
          <Routes>
            <Route path="/"     element={<Dashboard />} />
            <Route path="/load" element={<LoadMoney />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;