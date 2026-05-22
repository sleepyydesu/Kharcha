import { useLocation, useNavigate } from "react-router-dom";
import KharchaLogo from "../components/KharchaLogo";
import "./NotFound.css";

export default function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="not-found-page">
      <section className="not-found-card" aria-labelledby="not-found-title">
        <div className="not-found-visual" aria-hidden="true">
          <div className="not-found-wallet">
            <KharchaLogo size={42} />
            <span className="not-found-wallet__line" />
            <span className="not-found-wallet__chip" />
          </div>
          <span className="not-found-coin not-found-coin--one">₨</span>
          <span className="not-found-coin not-found-coin--two">?</span>
          <span className="not-found-coin not-found-coin--three">404</span>
        </div>

        <p className="not-found-eyebrow">Lost Transaction</p>
        <h1 id="not-found-title">404</h1>
        <h2>This page slipped out of your wallet.</h2>
        <p className="not-found-copy">
          We could not find <code>{location.pathname}</code>. It may have been
          moved, renamed, or never existed in Kharcha.
        </p>

        <div className="not-found-actions">
          <button type="button" onClick={() => navigate("/")}>Go Home</button>
          <button type="button" className="not-found-actions__ghost" onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </section>
    </div>
  );
}
