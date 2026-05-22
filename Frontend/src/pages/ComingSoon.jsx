import { useNavigate } from "react-router-dom";
import bankIcon from "../assets/bankIcon.svg";
import "./ComingSoon.css";

export default function ComingSoon() {
  const navigate = useNavigate();

  return (
    <div className="coming-soon-page">
      <section className="coming-soon-card" aria-labelledby="coming-soon-title">
        <div className="coming-soon-orbit" aria-hidden="true">
          <span className="coming-soon-orbit__ring" />
          <span className="coming-soon-orbit__dot coming-soon-orbit__dot--one" />
          <span className="coming-soon-orbit__dot coming-soon-orbit__dot--two" />
          <span className="coming-soon-bank-badge">
            <img src={bankIcon} alt="" />
          </span>
        </div>

        <p className="coming-soon-eyebrow">Bank Transfer</p>
        <h1 id="coming-soon-title">Coming Soon</h1>
        <p className="coming-soon-copy">
          We are connecting Kharcha with bank rails so wallet-to-bank transfers
          feel as smooth as sending money to a friend.
        </p>

        <div className="coming-soon-steps" aria-label="Planned bank transfer features">
          <div>
            <span>01</span>
            Link bank account
          </div>
          <div>
            <span>02</span>
            Verify safely
          </div>
          <div>
            <span>03</span>
            Transfer instantly
          </div>
        </div>

        <div className="coming-soon-actions">
          <button type="button" onClick={() => navigate("/")}>Back to Dashboard</button>
          <button type="button" className="coming-soon-actions__ghost" onClick={() => navigate("/send")}>Send Money Instead</button>
        </div>
      </section>
    </div>
  );
}
