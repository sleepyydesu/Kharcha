import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

/* PAGES */
import Home from "./pages/Home";
import SendMoney from "./pages/SendMoney";
import SendMoneyConfirm from "./pages/SendMoneyConfirm";
import LoadMoney from "./pages/LoadMoney";
import LoadMoneyConfirm from "./pages/LoadMoneyConfirm";
import TopUp from "./pages/TopUp";
import Statements from "./pages/Statements";
import Services from "./pages/Services";

/* ================= PLACEHOLDER ================= */
const Placeholder = ({ name }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      fontSize: "20px",
      fontWeight: "600",
      color: "#1E5C38",
    }}
  >
    {name} — Coming Soon
  </div>
);

/* ================= APP ================= */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* HOME */}
        <Route path="/" element={<Home />} />

        {/* SEND MONEY */}
        <Route path="/send" element={<SendMoney />} />
        <Route path="/send/confirm" element={<SendMoneyConfirm />} />

        {/* LOAD MONEY */}
        <Route path="/load" element={<LoadMoney />} />
        <Route path="/load/confirm" element={<LoadMoneyConfirm />} />

        {/* TOPUP (if separate page exists) */}
        <Route path="/topup" element={<TopUp />} />

        {/* ✅ STATEMENTS (CONNECTED TO BACKEND) */}
        <Route path="/statements" element={<Statements />} />

        {/* OTHER */}
        <Route path="/qr" element={<Placeholder name="QR Scanner" />} />
        <Route path="/expenses" element={<Placeholder name="Expenses" />} />

        <Route path="/account" element={<Placeholder name="Account" />} />
        <Route path="/services" element={<Services />} />
        <Route
          path="/bank-transfer"
          element={<Placeholder name="Bank Transfer" />}
        />

        {/* BILL */}
        <Route
          path="/bills/water"
          element={<Placeholder name="Water Bill" />}
        />
        <Route
          path="/bills/education"
          element={<Placeholder name="Education Fee" />}
        />
        <Route
          path="/bills/electricity"
          element={<Placeholder name="Electricity Bill" />}
        />
        <Route
          path="/bills/internet-tv"
          element={<Placeholder name="Internet / TV" />}
        />

        {/* TRANSACTION DETAIL */}
        <Route
          path="/transaction/:id"
          element={<Placeholder name="Transaction Detail" />}
        />
      </Routes>
    </BrowserRouter>
  );
}
