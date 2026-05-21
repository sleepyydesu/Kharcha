import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import KharchaLogo from "../assets/KharchaLogo.png";
import "./PaymentGateway.css"; // reuse all kpw-* styles

// ── Base URL ───────────────────────────────────────────────────
const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function apiFetch(path, options = {}) {
    const res = await fetch(`${BASE}${path}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json", ...options.headers },
        ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
}

// ── Brand ──────────────────────────────────────────────────────
function KharchaWordmark() {
    return (
        <div className="kpw-wordmark">
            <img src={KharchaLogo} alt="Kharcha" className="kpw-wordmark-logo" />
            <span>Kharcha</span>
        </div>
    );
}

function KharchaPoweredLogo() {
    return (
        <div className="kpw-left-footer">
            <span className="kpw-powered-label">Secured by</span>
            <div className="kpw-powered-brand">
                <img src={KharchaLogo} alt="Kharcha" className="kpw-powered-logo" />
                <span>Kharcha</span>
            </div>
        </div>
    );
}

// ── Icons ──────────────────────────────────────────────────────
const IconShield = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7l-9-5z" />
    </svg>
);
const IconEye = ({ off }) => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {off ? (
            <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>
        ) : (
            <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
        )}
    </svg>
);
const IconCheck = () => (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-5.5" />
    </svg>
);
const IconXCircle = () => (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
);
const IconLink = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
);
function Spinner({ size = 18, color = "currentColor" }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
            style={{ animation: "kpw-spin 0.7s linear infinite", flexShrink: 0 }}>
            <path d="M12 2a10 10 0 0110 10" />
        </svg>
    );
}

// ── Permission row ─────────────────────────────────────────────
function PermissionRow({ text }) {
    return (
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: "2px", flexShrink: 0 }}>
                <polyline points="20 6 9 17 4 12" />
            </svg>
            <span style={{ fontSize: "13.5px", color: "var(--text-sub)", lineHeight: 1.45 }}>{text}</span>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────
export default function OAuthConsent() {
    const [searchParams] = useSearchParams();
    const client_id    = searchParams.get("client_id")    || "";
    const redirect_uri = searchParams.get("redirect_uri") || "";
    const state        = searchParams.get("state")        || "";

    // Client info loading
    const [clientInfo,    setClientInfo]    = useState(null);
    const [clientLoading, setClientLoading] = useState(true);
    const [clientErr,     setClientErr]     = useState("");

    // Auth form
    const [screen,         setScreen]         = useState("login");
    const [identifier,     setIdentifier]     = useState("");
    const [credential,     setCredential]     = useState("");
    const [showCredential, setShowCredential] = useState(false);
    const [loginErr,       setLoginErr]       = useState("");
    const [submitting,     setSubmitting]     = useState(false);

    // ── Fetch client info on mount ─────────────────────────────
    useEffect(() => {
        if (!client_id || !redirect_uri) {
            setClientErr("Missing client_id or redirect_uri.");
            setClientLoading(false);
            return;
        }
        const params = new URLSearchParams({ client_id, redirect_uri });
        if (state) params.set("state", state);

        apiFetch(`/oauth/authorize?${params}`)
            .then(d => setClientInfo(d))
            .catch(e => setClientErr(e.message || "Unknown client application."))
            .finally(() => setClientLoading(false));
    }, []); // eslint-disable-line

    // ── Normalise phone ────────────────────────────────────────
    function normaliseIdentifier(raw) {
        const digits = raw.replace(/\D/g, "");
        if (/^\d{10}$/.test(digits)) return `+977${digits}`;
        if (/^977\d{10}$/.test(digits)) return `+${digits}`;
        return raw.trim();
    }

    // ── Deny / cancel ──────────────────────────────────────────
    function handleDeny() {
        try {
            const url = new URL(redirect_uri);
            url.searchParams.set("error", "access_denied");
            if (state) url.searchParams.set("state", state);
            window.location.href = url.toString();
        } catch {
            setScreen("denied");
        }
    }

    // ── Sign in + authorize in one shot ───────────────────────
    async function handleAuthorize(e) {
        e.preventDefault();
        if (!identifier.trim() || !credential.trim()) return;

        setSubmitting(true);
        setLoginErr("");

        try {
            // Step 1: sign in to get JWT cookie
            await apiFetch("/auth/signin", {
                method: "POST",
                body: JSON.stringify({
                    identifier: normaliseIdentifier(identifier),
                    credential: credential.trim(),
                }),
            });

            // Step 2: complete the OAuth authorization (JWT cookie is now set)
            const data = await apiFetch("/oauth/authorize/complete", {
                method: "POST",
                body: JSON.stringify({ client_id, redirect_uri, state }),
            });

            setScreen("success");
            // Redirect after a short pause so the user sees the success state
            setTimeout(() => {
                window.location.href = data.redirect_url;
            }, 1200);
        } catch (err) {
            setLoginErr(err.message || "Invalid credentials. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    // ── Render ─────────────────────────────────────────────────
    return (
        <div className="kpw-root">
            <div className="kpw-container">

                {/* ── Left — app + permissions ── */}
                <div className="kpw-left">
                    <div className="kpw-left-inner">
                        <KharchaWordmark />

                        {clientLoading && (
                            <div className="kpw-left-loading">
                                <Spinner size={26} color="var(--primary)" />
                            </div>
                        )}

                        {!clientLoading && clientErr && (
                            <p className="kpw-left-err-text">This authorization link is invalid or has expired.</p>
                        )}

                        {!clientLoading && !clientErr && clientInfo && (
                            <>
                                <h1 className="kpw-left-heading">Account Linking</h1>

                                <div className="kpw-billed-row">
                                    <span className="kpw-billed-label">Application:</span>
                                    <span className="kpw-billed-value">{clientInfo.client.name}</span>
                                </div>

                                <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "20px", marginBottom: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                    Permissions requested
                                </p>

                                <div>
                                    {(clientInfo.permissions || []).map((p, i) => (
                                        <PermissionRow key={i} text={p} />
                                    ))}
                                </div>

                                <div style={{
                                    marginTop: "24px",
                                    padding: "12px 14px",
                                    background: "var(--shaded-background)",
                                    border: "1px solid var(--border)",
                                    borderRadius: "10px",
                                    display: "flex",
                                    gap: "10px",
                                    alignItems: "flex-start",
                                }}>
                                    <span style={{ color: "var(--primary)", marginTop: "1px" }}><IconShield /></span>
                                    <p style={{ fontSize: "12.5px", color: "var(--text-sub)", margin: 0, lineHeight: 1.5 }}>
                                        You can revoke this access at any time from your Kharcha account settings.
                                    </p>
                                </div>
                            </>
                        )}

                        <KharchaPoweredLogo />
                    </div>
                </div>

                {/* ── Right — auth flow ── */}
                <div className="kpw-right">
                    <div className="kpw-right-inner">

                        {/* Invalid client */}
                        {!clientLoading && clientErr && (
                            <div className="kpw-panel kpw-panel--result">
                                <div className="kpw-result-icon kpw-result-icon--fail"><IconXCircle /></div>
                                <h2 className="kpw-result-title">Invalid Request</h2>
                                <p className="kpw-result-sub">{clientErr}</p>
                            </div>
                        )}

                        {/* Loading client */}
                        {clientLoading && (
                            <div className="kpw-panel kpw-panel--result">
                                <Spinner size={32} color="var(--primary)" />
                            </div>
                        )}

                        {/* ── Screen: login + consent ── */}
                        {!clientLoading && !clientErr && screen === "login" && (
                            <div className="kpw-panel">
                                <div className="kpw-panel-topbar">
                                    <div className="kpw-panel-icon"><IconLink /></div>
                                    <h2>Sign in to Authorize</h2>
                                </div>
                                <div className="kpw-panel-body">
                                    <div className="kpw-panel-head">
                                        <p>
                                            Sign in to your Kharcha account to allow{" "}
                                            <strong>{clientInfo?.client?.name}</strong>{" "}
                                            to link your wallet.
                                        </p>
                                    </div>

                                    <form className="kpw-form" onSubmit={handleAuthorize} noValidate>
                                        <div className="kpw-field">
                                            <label className="kpw-label">Mobile Number or Email</label>
                                            <input
                                                className="kpw-input"
                                                type="text"
                                                placeholder="98XXXXXXXX or you@email.com"
                                                value={identifier}
                                                onChange={e => { setIdentifier(e.target.value); setLoginErr(""); }}
                                                autoFocus
                                                autoComplete="username"
                                            />
                                        </div>

                                        <div className="kpw-field">
                                            <label className="kpw-label">Password / MPIN</label>
                                            <div className="kpw-input-wrap">
                                                <input
                                                    className={`kpw-input kpw-input--icon-right${loginErr ? " kpw-input--err" : ""}`}
                                                    type={showCredential ? "text" : "password"}
                                                    placeholder="Enter your password or MPIN"
                                                    value={credential}
                                                    onChange={e => { setCredential(e.target.value); setLoginErr(""); }}
                                                    autoComplete="current-password"
                                                />
                                                <button type="button" className="kpw-eye-btn"
                                                    onClick={() => setShowCredential(v => !v)}
                                                    tabIndex={-1} aria-label={showCredential ? "Hide" : "Show"}>
                                                    <IconEye off={showCredential} />
                                                </button>
                                            </div>
                                        </div>

                                        {loginErr && <p className="kpw-err-text">{loginErr}</p>}

                                        <button className="kpw-btn kpw-btn--primary" type="submit"
                                            disabled={submitting || !identifier.trim() || !credential.trim()}>
                                            {submitting
                                                ? <><Spinner size={16} color="#fff" /> Authorizing…</>
                                                : "Authorize Access →"}
                                        </button>
                                    </form>
                                </div>

                                <div className="kpw-panel-cancel-row">
                                    <button type="button" className="kpw-cancel-link" onClick={handleDeny}>
                                        Cancel — don't link this app
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── Screen: success ── */}
                        {screen === "success" && (
                            <div className="kpw-panel kpw-panel--result">
                                <div className="kpw-result-icon kpw-result-icon--success"><IconCheck /></div>
                                <h2 className="kpw-result-title">Authorization Granted</h2>
                                <p className="kpw-result-sub">
                                    Your Kharcha wallet has been linked to{" "}
                                    <strong>{clientInfo?.client?.name}</strong>.
                                </p>
                                <p className="kpw-result-redirect">Redirecting back…</p>
                            </div>
                        )}

                        {/* ── Screen: denied (redirect failed) ── */}
                        {screen === "denied" && (
                            <div className="kpw-panel kpw-panel--result">
                                <div className="kpw-result-icon kpw-result-icon--fail"><IconXCircle /></div>
                                <h2 className="kpw-result-title">Authorization Cancelled</h2>
                                <p className="kpw-result-sub">You did not grant access. You can close this window.</p>
                            </div>
                        )}

                    </div>
                </div>

            </div>
        </div>
    );
}