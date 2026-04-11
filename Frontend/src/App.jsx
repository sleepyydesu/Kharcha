import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import BalancePanel from "./components/BalancePanel";
import Dashboard from "./pages/Dashboard";
import LoadMoney from "./pages/LoadMoney";
import Statements from "./pages/Statements";
import StatementDetail from "./pages/StatementDetail";
import Account from "./pages/Account";
import "./styles/variables.css";
import "./App.css";
import Expenses from "./pages/Expenses";

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <BalancePanel />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/load" element={<LoadMoney />} />
            <Route path="/statements" element={<Statements />} />
            <Route
              path="/statements/:transaction_id"
              element={<StatementDetail />}
            />
            <Route path="/account" element={<Account />} />
            <Route path="/expenses" element={<Expenses />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
