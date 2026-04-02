import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";

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
        {/* MAIN */}
        <Route path="/" element={<Home />} />

        {/* CORE FEATURES */}
        <Route path="/send" element={<Placeholder name="Send Money" />} />
        <Route path="/load" element={<Placeholder name="Load Money" />} />
        <Route path="/qr" element={<Placeholder name="QR Scanner" />} />

        {/* NAVBAR ROUTES */}
        <Route path="/statements" element={<Placeholder name="Statements" />} />
        <Route path="/expenses" element={<Placeholder name="expenses" />} />
        <Route path="/account" element={<Placeholder name="Account" />} />

        {/* EXTRA FEATURES */}
        <Route
          path="/bank-transfer"
          element={<Placeholder name="Bank Transfer" />}
        />
        <Route path="/topup" element={<Placeholder name="Top Up" />} />

        {/* BILL PAYMENTS */}
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

        {/* ✅ NEW ROUTE (IMPORTANT) */}
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
