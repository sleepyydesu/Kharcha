import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import {
    listApiKeys, createApiKey, updateApiKey, revokeApiKey,
    getTransactionCategories,
} from "../services/api";
import "./OrgQRCodes.css";

// ─── Icons ─────────────────────────────────────────────────────
function BackArrow()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>; }
function PlusIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function DeleteIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>; }
function KeyIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6M15.5 7.5l3 3"/></svg>; }
function CloseIcon()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function CopyIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>; }
function CheckIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>; }
function DownloadIcon(){ return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>; }
function DocsIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/></svg>; }

function fmtDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-NP", { day: "numeric", month: "short", year: "numeric" });
}

// ─── QR canvas helper ──────────────────────────────────────────
// Payload: { kharcha_qr_id: api_key_id } — scanner resolves this to
// the org's account + default category via GET /api/qr-codes/:id
function QRCanvas({ apiKeyId, size = 90 }) {
    const canvasRef = useRef(null);
    useEffect(() => {
        if (!canvasRef.current || !apiKeyId) return;
        QRCode.toCanvas(canvasRef.current, JSON.stringify({ kharcha_qr_id: apiKeyId }), {
            width: size, margin: 1,
            color: { dark: "#111111", light: "#ffffff" },
        });
    }, [apiKeyId, size]);
    return <canvas ref={canvasRef} className="oqr__qr-canvas" width={size} height={size} />;
}

// ─── Copy button ───────────────────────────────────────────────
function CopyButton({ text, label = "Copy" }) {
    const [copied, setCopied] = useState(false);
    function handleCopy() {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }
    return (
        <button className={`oqr__copy-btn${copied ? " oqr__copy-btn--ok" : ""}`} onClick={handleCopy}>
            {copied ? <><CheckIcon /> Copied!</> : <><CopyIcon /> {label}</>}
        </button>
    );
}

// ─── Modal ─────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
    return (
        <div className="oqr__modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="oqr__modal">
                <div className="oqr__modal-header">
                    <h2 className="oqr__modal-title">{title}</h2>
                    <button className="oqr__modal-close" onClick={onClose}><CloseIcon /></button>
                </div>
                <div className="oqr__modal-body">{children}</div>
            </div>
        </div>
    );
}

// ─── QR enlarge modal ──────────────────────────────────────────
function QRModal({ apiKey, onClose }) {
    const canvasRef = useRef(null);
    useEffect(() => {
        if (!canvasRef.current || !apiKey) return;
        QRCode.toCanvas(canvasRef.current, JSON.stringify({ kharcha_qr_id: apiKey.api_key_id }), {
            width: 260, margin: 2,
            color: { dark: "#111111", light: "#ffffff" },
        });
    }, [apiKey]);

    function handleDownload() {
        if (!canvasRef.current) return;
        const a = document.createElement("a");
        a.download = `kharcha-qr-${(apiKey.name || "key").replace(/\s+/g, "-")}.png`;
        a.href = canvasRef.current.toDataURL("image/png");
        a.click();
    }

    return (
        <Modal title={apiKey.name || "QR Code"} onClose={onClose}>
            <div className="oqr__qr-detail">
                <canvas ref={canvasRef} className="oqr__qr-detail-canvas" />
                <p className="oqr__qr-detail-label">
                    Customers scan this to pay your organisation.
                    {apiKey.transaction_categories?.name && (
                        <> Default category: <strong>{apiKey.transaction_categories.name}</strong>.</>
                    )}
                    {" "}They can change category &amp; remarks before paying.
                </p>
                <p className="oqr__qr-detail-id">{apiKey.api_key_id}</p>
                <button className="oqr__btn oqr__btn--ghost" onClick={handleDownload}>
                    <DownloadIcon /> Download PNG
                </button>
            </div>
        </Modal>
    );
}

// ─── Per-key settings panel (category + webhook) ───────────────
function KeySettings({ apiKey, categories, onUpdated }) {
    const [catId,       setCatId]       = useState(apiKey.default_category_id ?? "");
    const [callbackUrl, setCallbackUrl] = useState(apiKey.callback_url ?? "");
    const [saving,      setSaving]      = useState(false);
    const [feedback,    setFeedback]    = useState("");

    async function handleSave() {
        setSaving(true); setFeedback("");
        try {
            const data = await updateApiKey(apiKey.api_key_id, {
                default_category_id: catId ? Number(catId) : null,
                callback_url: callbackUrl.trim() || null,
            });
            onUpdated(data.api_key);
            setFeedback("Saved ✓");
            setTimeout(() => setFeedback(""), 2000);
        } catch (e) {
            setFeedback(e.message || "Failed to save.");
        } finally {
            setSaving(false);
        }
    }

    const isDirty =
        String(catId) !== String(apiKey.default_category_id ?? "") ||
        (callbackUrl.trim() || "") !== (apiKey.callback_url ?? "");

    return (
        <div className="oqr__key-card__bottom">
            <div className="oqr__field" style={{ marginBottom: "10px" }}>
                <label className="oqr__label oqr__label--sm">Default Transaction Category</label>
                <div className="oqr__key-cat-row">
                    <select
                        className="oqr__select oqr__select--sm"
                        value={catId}
                        onChange={e => setCatId(e.target.value)}
                        disabled={saving}
                    >
                        <option value="">— None —</option>
                        {categories.map(cat => (
                            <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
                <p className="oqr__hint">Pre-selected when a customer scans this QR. They can still change it.</p>
            </div>

            <div className="oqr__field">
                <label className="oqr__label oqr__label--sm">
                    Webhook URL <span className="oqr__optional">(optional)</span>
                </label>
                <input
                    className="oqr__input"
                    type="url"
                    placeholder="https://yourapp.com/kharcha-webhook"
                    value={callbackUrl}
                    onChange={e => setCallbackUrl(e.target.value)}
                    disabled={saving}
                    style={{ fontSize: "0.8rem", padding: "7px 10px" }}
                />
                <p className="oqr__hint">
                    Kharcha POSTs <span className="oqr__hint-code">X-Kharcha-Event: qr_payment</span> here
                    after each successful payment via this QR — so your cashier app knows the payment arrived.
                </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
                <button
                    className="oqr__btn oqr__btn--primary oqr__btn--sm"
                    onClick={handleSave}
                    disabled={saving || !isDirty}
                >
                    {saving ? "Saving…" : "Save"}
                </button>
                {feedback && (
                    <span className={`oqr__apikey-feedback${feedback.includes("✓") ? " oqr__apikey-feedback--ok" : " oqr__apikey-feedback--err"}`}>
                        {feedback}
                    </span>
                )}
            </div>
        </div>
    );
}

// ─── Single key card ───────────────────────────────────────────
function KeyCard({ apiKey, categories, onUpdated, onRevoke }) {
    const [showQR,      setShowQR]      = useState(false);
    const [showRevoke,  setShowRevoke]  = useState(false);
    const [revoking,    setRevoking]    = useState(false);

    async function handleRevoke() {
        setRevoking(true);
        try {
            await revokeApiKey(apiKey.api_key_id);
            onRevoke(apiKey.api_key_id);
            setShowRevoke(false);
        } catch (e) {
            alert(e.message || "Failed to revoke.");
        } finally {
            setRevoking(false);
        }
    }

    const isActive = apiKey.is_active;

    return (
        <>
            <div className={`oqr__card${isActive ? "" : " oqr__card--inactive"}`}>
                {/* QR thumbnail */}
                <div className="oqr__card-qr" onClick={() => isActive && setShowQR(true)} title={isActive ? "Click to enlarge & download" : "Key revoked"}>
                    <QRCanvas apiKeyId={apiKey.api_key_id} size={90} />
                    {isActive && <span className="oqr__card-qr-hint">tap to enlarge</span>}
                </div>

                {/* Info + settings */}
                <div className="oqr__card-body">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <KeyIcon />
                        <span className="oqr__card-name">{apiKey.name || "API Key"}</span>
                        <span className={`oqr__badge ${isActive ? "oqr__badge--active" : "oqr__badge--inactive"}`}>
                            {isActive ? "Active" : "Revoked"}
                        </span>
                        {apiKey.transaction_categories?.name && (
                            <span className="oqr__badge oqr__badge--flex">{apiKey.transaction_categories.name}</span>
                        )}
                        {apiKey.callback_url && (
                            <span className="oqr__badge oqr__badge--webhook">Webhook</span>
                        )}
                    </div>
                    <code style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary,#9ca3af)", background: "var(--color-surface-raised,#f3f4f6)", padding: "2px 6px", borderRadius: "4px" }}>
                        {apiKey.key_prefix}••••••••••••••••••••••••••••••
                    </code>
                    <span style={{ fontSize: "0.72rem", color: "var(--color-text-tertiary,#9ca3af)" }}>
                        Created {fmtDate(apiKey.created_at)}
                        {apiKey.last_used_at && ` · Last used ${fmtDate(apiKey.last_used_at)}`}
                    </span>

                    {/* Settings only for active keys */}
                    {isActive && (
                        <KeySettings
                            apiKey={apiKey}
                            categories={categories}
                            onUpdated={onUpdated}
                        />
                    )}
                </div>

                {/* Revoke button */}
                {isActive && (
                    <div className="oqr__card-actions">
                        <button
                            className="oqr__icon-btn oqr__icon-btn--danger"
                            onClick={() => setShowRevoke(true)}
                            title="Revoke key"
                        >
                            <DeleteIcon />
                        </button>
                    </div>
                )}
            </div>

            {showQR && <QRModal apiKey={apiKey} onClose={() => setShowQR(false)} />}

            {showRevoke && (
                <Modal title="Revoke API Key?" onClose={() => setShowRevoke(false)}>
                    <div className="oqr__confirm">
                        <p>Revoke <strong>{apiKey.name}</strong> (<code>{apiKey.key_prefix}…</code>)?</p>
                        <p className="oqr__confirm-sub">
                            The QR code linked to this key will stop working immediately, and any POS system using this key will lose access. This cannot be undone.
                        </p>
                        <div className="oqr__form-actions">
                            <button className="oqr__btn oqr__btn--ghost" onClick={() => setShowRevoke(false)} disabled={revoking}>Cancel</button>
                            <button className="oqr__btn oqr__btn--danger" onClick={handleRevoke} disabled={revoking}>
                                {revoking ? "Revoking…" : "Yes, Revoke"}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}

// ─── Main Page ─────────────────────────────────────────────────
export default function OrgQRCodes() {
    const navigate = useNavigate();

    const [keys,       setKeys]       = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [newKeyName, setNewKeyName] = useState("");
    const [creating,   setCreating]   = useState(false);
    const [newRawKey,  setNewRawKey]  = useState(null);
    const [showCreate, setShowCreate] = useState(false);

    useEffect(() => {
        Promise.all([
            listApiKeys().then(d => setKeys(d?.api_keys || [])),
            getTransactionCategories().then(d => setCategories(d?.categories || [])),
        ]).finally(() => setLoading(false));
    }, []);

    async function handleCreate() {
        if (!newKeyName.trim()) return;
        setCreating(true);
        try {
            const data = await createApiKey({ name: newKeyName.trim() });
            setNewRawKey({ raw: data.api_key, info: data.key_info });
            setKeys(ks => [data.key_info, ...ks]);
            setShowCreate(false);
            setNewKeyName("");
        } catch (e) {
            alert(e.message || "Failed to create API key.");
        } finally {
            setCreating(false);
        }
    }

    const handleUpdated = useCallback((updated) => {
        setKeys(ks => ks.map(k => k.api_key_id === updated.api_key_id ? { ...k, ...updated } : k));
    }, []);

    const handleRevoke = useCallback((api_key_id) => {
        setKeys(ks => ks.map(k => k.api_key_id === api_key_id ? { ...k, is_active: false } : k));
    }, []);

    const activeKeys  = keys.filter(k => k.is_active);
    const revokedKeys = keys.filter(k => !k.is_active);

    return (
        <div className="oqr">
            <button className="oqr__back" onClick={() => navigate(-1)}><BackArrow /> Back</button>

            <div className="oqr__header">
                <div>
                    <h1 className="oqr__heading">QR Codes &amp; API Keys</h1>
                    <p className="oqr__sub">
                        Each key generates a unique QR code. Customers scan it to pay you — category and remarks are pre-filled but editable. Payments trigger your webhook so your cashier app knows instantly.
                    </p>
                </div>
                <div className="oqr__header-actions">
                    <button
                        className="oqr__btn oqr__btn--docs"
                        onClick={() => navigate("/developers")}
                    >
                        <DocsIcon /> Developer Docs
                    </button>
                    {activeKeys.length < 10 && (
                        <button className="oqr__btn oqr__btn--primary" onClick={() => setShowCreate(true)}>
                            <PlusIcon /> New Key
                        </button>
                    )}
                </div>
            </div>

            {/* Raw key banner — shown once after creation */}
            {newRawKey && (
                <div className="oqr__new-key-banner">
                    <div className="oqr__new-key-banner__icon">🔑</div>
                    <div className="oqr__new-key-banner__body">
                        <p className="oqr__new-key-banner__title">Copy your API key — it won't be shown again</p>
                        <p className="oqr__new-key-banner__sub">
                            Use this in your POS or store software. The QR code below is already ready to scan — no key needed for customers.
                        </p>
                        <div className="oqr__raw-key-row">
                            <code className="oqr__raw-key">{newRawKey.raw}</code>
                            <CopyButton text={newRawKey.raw} label="Copy key" />
                        </div>
                    </div>
                    <button className="oqr__modal-close" onClick={() => setNewRawKey(null)}><CloseIcon /></button>
                </div>
            )}

            {/* Create form */}
            {showCreate && (
                <div className="oqr__create-key-form">
                    <div className="oqr__field">
                        <label className="oqr__label">Key / Counter Name <span className="oqr__req">*</span></label>
                        <input
                            className="oqr__input"
                            placeholder="e.g. Main Counter, Table QR, Online Store"
                            value={newKeyName}
                            onChange={e => setNewKeyName(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleCreate()}
                            autoFocus
                        />
                        <p className="oqr__hint">Each key gets its own QR code. Create one per counter or terminal.</p>
                    </div>
                    <div className="oqr__form-actions">
                        <button className="oqr__btn oqr__btn--ghost" onClick={() => { setShowCreate(false); setNewKeyName(""); }} disabled={creating}>Cancel</button>
                        <button className="oqr__btn oqr__btn--primary" onClick={handleCreate} disabled={creating || !newKeyName.trim()}>
                            {creating ? "Creating…" : "Create"}
                        </button>
                    </div>
                </div>
            )}

            {loading && <p className="oqr__loading">Loading…</p>}

            {!loading && keys.length === 0 && (
                <div className="oqr__empty">
                    <div className="oqr__empty-icon">📲</div>
                    <p className="oqr__empty-title">No keys yet</p>
                    <p className="oqr__empty-sub">Create your first key to get a QR code customers can scan to pay you.</p>
                    <button className="oqr__btn oqr__btn--primary" onClick={() => setShowCreate(true)}><PlusIcon /> Create First Key</button>
                </div>
            )}

            {/* Active keys */}
            {activeKeys.length > 0 && (
                <div className="oqr__grid">
                    {activeKeys.map(key => (
                        <KeyCard
                            key={key.api_key_id}
                            apiKey={key}
                            categories={categories}
                            onUpdated={handleUpdated}
                            onRevoke={handleRevoke}
                        />
                    ))}
                </div>
            )}

            {/* Revoked keys */}
            {revokedKeys.length > 0 && (
                <details style={{ marginTop: "16px" }}>
                    <summary className="oqr__revoked-summary">Revoked keys ({revokedKeys.length})</summary>
                    <div className="oqr__grid" style={{ marginTop: "10px" }}>
                        {revokedKeys.map(key => (
                            <KeyCard
                                key={key.api_key_id}
                                apiKey={key}
                                categories={categories}
                                onUpdated={handleUpdated}
                                onRevoke={handleRevoke}
                            />
                        ))}
                    </div>
                </details>
            )}
        </div>
    );
}