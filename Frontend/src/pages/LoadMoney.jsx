import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { initiateKhalti, redeemGiftCard } from "../services/api";
import "./LoadMoney.css";

import giftcardIcon from "../assets/giftcardIcon.png";
import khaltiIcon from "../assets/khaltiIcon.png";

function BackArrow() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
        >
            <polyline points="15 18 9 12 15 6" />
        </svg>
    );
}

/* ── Khalti callback result banner ───────────────────────── */
function KhaltiBanner({ params, onDismiss }) {
    const status = params.get("khalti");
    if (!status) return null;

    if (status === "success") {
        const amount = params.get("amount");
        const balance = params.get("balance");
        return (
            <div className="lm__banner lm__banner--success">
                <span className="lm__banner-icon">✓</span>
                <div>
                    <strong>
                        NPR {Number(amount).toLocaleString()} loaded!
                    </strong>
                    <p>
                        New balance: NPR{" "}
                        {Number(balance).toLocaleString("ne-NP", {
                            minimumFractionDigits: 2,
                        })}
                    </p>
                </div>
                <button className="lm__banner-close" onClick={onDismiss}>
                    ✕
                </button>
            </div>
        );
    }
    if (status === "already") {
        return (
            <div className="lm__banner lm__banner--info">
                <span className="lm__banner-icon">ℹ</span>
                <div>
                    <strong>Already processed</strong>
                    <p>This payment was already credited to your wallet.</p>
                </div>
                <button className="lm__banner-close" onClick={onDismiss}>
                    ✕
                </button>
            </div>
        );
    }
    // failed
    const message = params.get("message") || "Payment could not be verified.";
    return (
        <div className="lm__banner lm__banner--error">
            <span className="lm__banner-icon">✕</span>
            <div>
                <strong>Payment failed</strong>
                <p>{message}</p>
            </div>
            <button className="lm__banner-close" onClick={onDismiss}>
                ✕
            </button>
        </div>
    );
}

/* ── Choose method ───────────────────────────────────────── */
function ChooseView({ onSelect }) {
    return (
        <div className="lm__choose">
            <h1 className="lm__heading">Load Wallet</h1>
            <p className="lm__sub">
                Choose how you'd like to add money to your Kharcha wallet.
            </p>

            <div className="lm__methods">
                <button
                    className="lm__method-card"
                    onClick={() => onSelect("khalti")}
                >
                    <div className="lm__method-icon lm__method-icon--khalti">
                        <img src={khaltiIcon} alt="Khalti" />
                    </div>
                    <div className="lm__method-info">
                        <span className="lm__method-name">
                            Load with Khalti
                        </span>
                        <span className="lm__method-desc">
                            Pay instantly via your Khalti wallet or card
                        </span>
                    </div>
                    <span className="lm__method-arrow">›</span>
                </button>

                <button
                    className="lm__method-card"
                    onClick={() => onSelect("giftcard")}
                >
                    <div className="lm__method-icon lm__method-icon--gift">
                        <img src={giftcardIcon} alt="Gift Card" />
                    </div>
                    <div className="lm__method-info">
                        <span className="lm__method-name">Gift Cards</span>
                        <span className="lm__method-desc">
                            Redeem a Kharcha gift card code
                        </span>
                    </div>
                    <span className="lm__method-arrow">›</span>
                </button>
            </div>
        </div>
    );
}

/* ── Khalti flow ─────────────────────────────────────────── */
const PRESETS = [100, 500, 1000, 2000, 5000];

function KhaltiView() {
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handlePay() {
        const amt = parseFloat(amount);
        if (!amt || amt < 10) {
            setError("Minimum amount is NPR 10");
            return;
        }
        if (amt > 100000) {
            setError("Maximum is NPR 1,00,000");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const d = await initiateKhalti(amt);
            window.location.href = d.payment_url;
        } catch (e) {
            setError(e.message);
            setLoading(false);
        }
    }

    return (
        <div className="lm__form-wrap">
            <div className="lm__form-header lm__form-header--khalti">
                <img
                    src={khaltiIcon}
                    alt="Khalti"
                    className="lm__form-header-img"
                />
                <div>
                    <h2 className="lm__form-title">Load with Khalti</h2>
                    <p className="lm__form-sub">
                        Enter the amount you want to load
                    </p>
                </div>
            </div>

            <label className="lm__label">Amount (NPR)</label>
            <div className="lm__input-row">
                <span className="lm__prefix">रू</span>
                <input
                    className="lm__input"
                    type="number"
                    min="10"
                    max="100000"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => {
                        setAmount(e.target.value);
                        setError("");
                    }}
                />
            </div>

            <div className="lm__presets">
                {PRESETS.map((p) => (
                    <button
                        key={p}
                        className={`lm__preset ${amount == p ? "lm__preset--active" : ""}`}
                        onClick={() => setAmount(String(p))}
                    >
                        {p.toLocaleString()}
                    </button>
                ))}
            </div>

            {error && <p className="lm__error">{error}</p>}

            <button
                className="lm__pay-btn lm__pay-btn--khalti"
                onClick={handlePay}
                disabled={loading || !amount}
            >
                {loading ? "Redirecting…" : "Pay with Khalti"}
            </button>
            <p className="lm__note">
                You'll be redirected to Khalti to complete payment
            </p>
        </div>
    );
}

/* ── Gift card flow ──────────────────────────────────────── */
function GiftView({ onSuccess }) {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    async function handleRedeem() {
        if (!code.trim()) {
            setError("Please enter a gift card code");
            return;
        }
        setLoading(true);
        setError("");
        try {
            await redeemGiftCard(code.trim());
            setSuccess(true);
            // ✅ do NOT call onSuccess here — let the success screen render first
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <div className="lm__success">
                <div className="lm__success-ring">✓</div>
                <h2>Redeemed!</h2>
                <p>Your gift card balance has been added to your wallet.</p>
                <button
                    className="lm__pay-btn lm__pay-btn--gift"
                    onClick={onSuccess}
                >
                    Done
                </button>
            </div>
        );
    }

    return (
        <div className="lm__form-wrap">
            <div className="lm__form-header lm__form-header--gift">
                <img
                    src={giftcardIcon}
                    alt="Gift Card"
                    className="lm__form-header-img"
                />
                <div>
                    <h2 className="lm__form-title">Gift Cards</h2>
                    <p className="lm__form-sub">
                        Enter your gift card code below
                    </p>
                </div>
            </div>

            <label className="lm__label">Gift Card Code</label>
            <input
                className="lm__input lm__input--code"
                type="text"
                placeholder="XXXX-XXXX-XXXX"
                value={code}
                maxLength={20}
                onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setError("");
                }}
            />

            {error && <p className="lm__error">{error}</p>}

            <button
                className="lm__pay-btn lm__pay-btn--gift"
                onClick={handleRedeem}
                disabled={loading || !code}
            >
                {loading ? "Redeeming…" : "Redeem Gift Card"}
            </button>
        </div>
    );
}

/* ── Gift Card QR scan result banner ────────────────────────── */
function GiftcardQRBanner({ params, onDismiss }) {
    const status = params.get("giftcard");
    if (!status) return null;
    if (status === "redeemed") {
        return (
            <div className="lm__banner lm__banner--success">
                <span className="lm__banner-icon">✓</span>
                <div>
                    <strong>Gift card redeemed!</strong>
                    <p>Balance has been added to your wallet.</p>
                </div>
                <button className="lm__banner-close" onClick={onDismiss}>
                    ✕
                </button>
            </div>
        );
    }
    const message = params.get("message") || "Could not redeem gift card.";
    return (
        <div className="lm__banner lm__banner--error">
            <span className="lm__banner-icon">✕</span>
            <div>
                <strong>Redemption failed</strong>
                <p>{message}</p>
            </div>
            <button className="lm__banner-close" onClick={onDismiss}>
                ✕
            </button>
        </div>
    );
}

/* ── Root ────────────────────────────────────────────────── */
export default function LoadMoney() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [view, setView] = useState("choose");

    const hasKhaltiResult = searchParams.get("khalti") !== null;
    const hasGiftcardResult = searchParams.get("giftcard") !== null;

    function dismissBanner() {
        setSearchParams({});
    }

    function handleBack() {
        if (view === "choose") navigate(-1);
        else setView("choose");
    }

    return (
        <div className="lm">
            {/* Khalti result banner */}
            {hasKhaltiResult && (
                <KhaltiBanner params={searchParams} onDismiss={dismissBanner} />
            )}

            {/* Gift card QR scan result banner */}
            {hasGiftcardResult && (
                <GiftcardQRBanner
                    params={searchParams}
                    onDismiss={dismissBanner}
                />
            )}

            <button className="lm__back" onClick={handleBack}>
                <BackArrow />
                {view === "choose" ? "Back" : "Choose Method"}
            </button>

            {view === "choose" && <ChooseView onSelect={setView} />}
            {view === "khalti" && <KhaltiView />}
            {view === "giftcard" && (
                <GiftView onSuccess={() => setView("choose")} />
            )}
        </div>
    );
}
