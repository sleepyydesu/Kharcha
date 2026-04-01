import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";

// Placeholder pages — other devs will build these
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/send" element={<Placeholder name="Send Money" />} />
        <Route path="/load" element={<Placeholder name="Load Money" />} />
        <Route
          path="/bank-transfer"
          element={<Placeholder name="Bank Transfer" />}
        />
        <Route path="/topup" element={<Placeholder name="Top Up" />} />
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
        <Route path="/more" element={<Placeholder name="More" />} />
        <Route path="/statement" element={<Placeholder name="Statement" />} />
        <Route path="/qr" element={<Placeholder name="QR Code" />} />
        <Route path="/support" element={<Placeholder name="Support" />} />
        <Route path="/expenses" element={<Placeholder name="Expenses" />} />
        <Route
          path="/transaction/:id"
          element={<Placeholder name="Transaction Detail" />}
        />
      </Routes>
    </BrowserRouter>
  );
}
