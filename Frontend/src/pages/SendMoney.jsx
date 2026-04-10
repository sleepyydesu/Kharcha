import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { transfer, lookupReceiver } from "../services/api";
import "./SendMoney.css";

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

function UserIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
        >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}

const PRESETS = [100, 500, 1000, 2000, 5000];

export default function SendMoney() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Prefill from QR scan params
    const qrId = searchParams.get("id") || "";
    const qrName = searchParams.get("name") || "";
    const qrAmount = searchParams.get("amount") || "";
    const qrNote = searchParams.get("note") || "";

    const [identifier, setIdentifier] = useState(qrId);
    const [resolvedName, setResolvedName] = useState(qrName);
    const [amount, setAmount] = useState(qrAmount);
    const [note, setNote] = useState(qrNote);

    const [lookupState, setLookupState] = useState(qrId ? "prefilled" : "idle"); // idle | loading | found | not_found | prefilled
    const [error, setError] = useState("");
    const [txState, setTxState] = useState("idle"); // idle | loading | success | error
    const [txData, setTxData] = useState(null);

    // Auto-lookup if prefilled from QR
    useEffect(() => {
        if (qrId && !qrName) {
            doLookup(qrId);
        }
    }, []); // eslint-disable-line

    async function doLookup(id) {
        const val = id ?? identifier;
        if (!val.trim()) return;
        setLookupState("loading");
        setResolvedName("");
        setError("");
        try {
            const d = await lookupReceiver(val.trim());
            const name =
                d?.name ||
                d?.full_name ||
                d?.user?.name ||
                d?.user?.full_name ||
                "";
            setResolvedName(name);
            setLookupState(name ? "found" : "not_found");
            if (!name) setError("No Kharcha user found with that ID.");
        } catch (e) {
            setResolvedName("");
            setLookupState("not_found");
            setError(e.message || "User not found.");
        }
    }

    async function handleSend() {
        const amt = parseFloat(amount);
        if (!identifier.trim()) {
            setError("Enter a phone number or Kharcha ID");
            return;
        }
        if (!amt || amt < 1) {
            setError("Enter a valid amount (min NPR 1)");
            return;
        }
        setTxState("loading");
        setError("");
        try {
            const d = await transfer({
                identifier: identifier.trim(),
                amount: amt,
                ...(note.trim() ? { note: note.trim() } : {}),
            });
            setTxData(d);
            setTxState("success");
        } catch (e) {
            setError(e.message || "Transfer failed.");
            setTxState("error");
        }
    }

    // ── Success screen
    if (txState === "success") {
        return (
            <div className="sm">
                <div className="sm__success">
                    <div className="sm__success-ring">✓</div>
                    <h2 className="sm__success-title">Sent!</h2>
                    <p className="sm__success-line">
                        NPR <strong>{Number(amount).toLocaleString()}</strong>{" "}
                        sent
                        {resolvedName ? ` to ${resolvedName}` : ""}
                    </p>
                    <button
                        className="sm__btn sm__btn--primary"
                        onClick={() => navigate("/statements")}
                    >
                        View Statement
                    </button>
                    <button
                        className="sm__btn sm__btn--ghost"
                        onClick={() => navigate("/")}
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    const canSend =
        identifier.trim() && parseFloat(amount) > 0 && txState !== "loading";

    return (
        <div className="sm">
            <button className="sm__back" onClick={() => navigate(-1)}>
                <BackArrow /> Back
            </button>

            <h1 className="sm__heading">Send Money</h1>
            <p className="sm__sub">Transfer funds to any Kharcha user</p>

            {/* QR prefill banner */}
            {qrId && (
                <div className="sm__qr-banner">
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="3" height="3" />
                        <rect x="17" y="17" width="3" height="3" />
                    </svg>
                    Details filled from QR scan
                </div>
            )}

            {/* Recipient */}
            <div className="sm__field">
                <label className="sm__label">Send to</label>
                <div className="sm__input-row">
                    <UserIcon />
                    <input
                        className="sm__input"
                        type="text"
                        placeholder="Phone number or Kharcha ID"
                        value={identifier}
                        readOnly={!!qrId}
                        onChange={(e) => {
                            setIdentifier(e.target.value);
                            setResolvedName("");
                            setLookupState("idle");
                            setError("");
                        }}
                        onBlur={() => {
                            if (!qrId && identifier.trim()) doLookup();
                        }}
                    />
                    {!qrId && (
                        <button
                            className="sm__lookup-btn"
                            onClick={() => doLookup()}
                            disabled={
                                lookupState === "loading" || !identifier.trim()
                            }
                        >
                            {lookupState === "loading" ? "…" : "Verify"}
                        </button>
                    )}
                </div>

                {/* Resolved name chip */}
                {(lookupState === "found" || lookupState === "prefilled") &&
                    resolvedName && (
                        <div className="sm__resolved">
                            <span className="sm__resolved-dot" />
                            {resolvedName}
                        </div>
                    )}
                {lookupState === "not_found" && (
                    <p className="sm__field-err">{error}</p>
                )}
            </div>

            {/* Amount */}
            <div className="sm__field">
                <label className="sm__label">Amount (NPR)</label>
                <div className="sm__amount-row">
                    <span className="sm__prefix">रू</span>
                    <input
                        className="sm__input sm__input--amount"
                        type="number"
                        min="1"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => {
                            setAmount(e.target.value);
                            setError("");
                        }}
                    />
                </div>
                <div className="sm__presets">
                    {PRESETS.map((p) => (
                        <button
                            key={p}
                            className={`sm__preset ${String(amount) === String(p) ? "sm__preset--active" : ""}`}
                            onClick={() => setAmount(String(p))}
                        >
                            {p.toLocaleString()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Note */}
            <div className="sm__field">
                <label className="sm__label">
                    Note <span className="sm__optional">(optional)</span>
                </label>
                <input
                    className="sm__input"
                    type="text"
                    placeholder="What's this for?"
                    maxLength={120}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />
            </div>

            {/* General error */}
            {txState === "error" && error && (
                <p className="sm__error">{error}</p>
            )}
            {txState !== "error" && error && lookupState !== "not_found" && (
                <p className="sm__error">{error}</p>
            )}

            <button
                className="sm__btn sm__btn--primary sm__btn--send"
                onClick={handleSend}
                disabled={!canSend}
            >
                {txState === "loading" ? "Sending…" : "Send Money"}
            </button>
        </div>
    );
}
