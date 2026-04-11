import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import jsQR from "jsqr";
import QRCode from "qrcode";
import { getProfile, redeemGiftCard, resolveQRCode } from "../services/api";
import "./QRScanner.css";

// ── Icons ─────────────────────────────────────────────────────
function CloseIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
        >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}
function ScanIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="3" height="3" />
            <rect x="17" y="17" width="3" height="3" />
            <line x1="17" y1="14" x2="20" y2="14" />
            <line x1="20" y1="14" x2="20" y2="17" />
        </svg>
    );
}
function UserIcon() {
    return (
        <svg
            width="20"
            height="20"
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

// ── Parse QR text ─────────────────────────────────────────────
function parseQR(text) {
    try {
        const obj = JSON.parse(text);
        if (obj.giftcard_id) return { type: "giftcard", code: obj.giftcard_id };
        // Dynamic org QR — must be resolved from server
        if (obj.kharcha_qr_id) return { type: "dynamic_qr", qr_id: obj.kharcha_qr_id };
        if (obj.kharcha_id)
            return {
                type: "payment",
                id: obj.kharcha_id,
                name: obj.name || "",
                amount: obj.amount || null,
                note: obj.note || "",
            };
    } catch {}
    // bare phone number
    if (/^\+?977\d{9,}$/.test(text) || /^\d{10}$/.test(text)) {
        return { type: "payment", id: text, name: "", amount: null, note: "" };
    }
    return null;
}

// ── Camera scanner using jsQR (works in all browsers) ────────
function CameraScanner({ onDetect }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const rafRef = useRef(null);
    const firedRef = useRef(false);
    // Keep onDetect in a ref so the effect never needs to re-run when it changes.
    // Without this, every re-render of the parent (e.g. App state update) would
    // produce a new onDetect reference → useEffect would tear down and restart
    // the camera, making scanning impossible.
    const onDetectRef = useRef(onDetect);
    useEffect(() => { onDetectRef.current = onDetect; }, [onDetect]);

    const [camStatus, setCamStatus] = useState("starting"); // starting | active | denied

    useEffect(() => {
        let cancelled = false;

        async function start() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: "environment" },
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    },
                });
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                streamRef.current = stream;
                const video = videoRef.current;
                video.srcObject = stream;
                video.setAttribute("playsinline", "true");
                await video.play();
                if (!cancelled) {
                    setCamStatus("active");
                    rafRef.current = requestAnimationFrame(tick);
                }
            } catch {
                if (!cancelled) setCamStatus("denied");
            }
        }

        function tick() {
            if (cancelled || firedRef.current) return;
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas || video.readyState < 2) {
                rafRef.current = requestAnimationFrame(tick);
                return;
            }
            const w = video.videoWidth;
            const h = video.videoHeight;
            if (!w || !h) {
                rafRef.current = requestAnimationFrame(tick);
                return;
            }

            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            ctx.drawImage(video, 0, 0, w, h);
            const imgData = ctx.getImageData(0, 0, w, h);
            const result = jsQR(imgData.data, imgData.width, imgData.height, {
                inversionAttempts: "dontInvert",
            });
            if (result && result.data && !firedRef.current) {
                firedRef.current = true;
                // Pass a `resume` callback so handleDetect can restart scanning
                // if the QR was unrecognized — without it, firedRef stays true
                // and the scanner silently deadlocks on any unrecognized QR.
                onDetectRef.current(result.data, () => {
                    if (!cancelled) {
                        firedRef.current = false;
                        rafRef.current = requestAnimationFrame(tick);
                    }
                });
                return;
            }
            rafRef.current = requestAnimationFrame(tick);
        }

        start();
        return () => {
            cancelled = true;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            streamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, []); // empty deps — camera starts once, stays alive for the modal's lifetime

    if (camStatus === "denied") {
        return (
            <div className="qrs__cam-msg">
                <div className="qrs__cam-icon">🚫</div>
                <p className="qrs__cam-title">Camera access denied</p>
                <p className="qrs__cam-sub">
                    Allow camera permission in your browser settings, then
                    reload the page.
                </p>
                <button
                    className="qrs__retry-btn"
                    onClick={() => window.location.reload()}
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="qrs__camera-wrap">
            <video
                ref={videoRef}
                className="qrs__video"
                muted
                playsInline
                autoPlay
            />
            {/* jsQR reads from this hidden canvas */}
            <canvas ref={canvasRef} style={{ display: "none" }} />

            <div className="qrs__overlay">
                <div className="qrs__reticle">
                    <span className="qrs__corner qrs__corner--tl" />
                    <span className="qrs__corner qrs__corner--tr" />
                    <span className="qrs__corner qrs__corner--bl" />
                    <span className="qrs__corner qrs__corner--br" />
                    {camStatus === "active" && (
                        <span className="qrs__scanline" />
                    )}
                </div>
                <p className="qrs__hint">
                    {camStatus === "starting"
                        ? "Starting camera…"
                        : "Align QR code within the frame"}
                </p>
            </div>
        </div>
    );
}

// ── Processing screen shown after a QR is detected ────────────
function ProcessingScreen({ label }) {
    return (
        <div className="qrs__processing">
            <div className="qrs__processing-ring">
                <svg
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                >
                    <path d="M20 6 9 17l-5-5" />
                </svg>
            </div>
            <p className="qrs__processing-text">{label}</p>
        </div>
    );
}

// ── User's own QR code ─────────────────────────────────────────
function MyQRCode() {
    const canvasRef = useRef(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getProfile()
            .then((d) => setProfile(d?.profile))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!profile || !canvasRef.current) return;
        const payload = JSON.stringify({
            kharcha_id: profile.phone_number || profile.email || "",
            name: profile.full_name || profile.organization_name || profile.name || "",
        });
        QRCode.toCanvas(canvasRef.current, payload, {
            width: 220,
            margin: 2,
            color: { dark: "#111111", light: "#ffffff" },
        });
    }, [profile]);

    if (loading) {
        return (
            <div className="qrs__myqr">
                <div className="qrs__myqr-card">
                    <div className="qrs__skeleton qrs__skeleton--square" />
                    <div className="qrs__skeleton qrs__skeleton--line" />
                </div>
            </div>
        );
    }

    return (
        <div className="qrs__myqr">
            <div className="qrs__myqr-card">
                <p className="qrs__myqr-label">Your Kharcha QR</p>
                <canvas ref={canvasRef} className="qrs__myqr-canvas" />
                <p className="qrs__myqr-name">
                    {profile?.full_name || profile?.name || "—"}
                </p>
                <p className="qrs__myqr-id">
                    {profile?.phone || profile?.email || "—"}
                </p>
                <p className="qrs__myqr-note">
                    Others scan this to send you money
                </p>
            </div>
        </div>
    );
}

// ── Root modal component ───────────────────────────────────────
export default function QRScanner({ open, onClose }) {
    const navigate = useNavigate();
    const [mode, setMode] = useState("scan"); // "scan" | "myqr"
    const [processing, setProcessing] = useState(null); // null | { label }

    // Reset on every open
    useEffect(() => {
        if (open) {
            setMode("scan");
            setProcessing(null);
        }
    }, [open]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    const handleDetect = useCallback(
        async (raw, resume) => {
            const parsed = parseQR(raw);
            if (!parsed) {
                // Unrecognized QR — resume scanning instead of deadlocking
                resume?.();
                return;
            }

            if (parsed.type === "giftcard") {
                setProcessing({ label: "Redeeming gift card…" });
                try {
                    await redeemGiftCard(parsed.code);
                    onClose();
                    navigate("/load?giftcard=redeemed");
                } catch (e) {
                    onClose();
                    navigate(
                        `/load?giftcard=failed&message=${encodeURIComponent(e.message || "Redemption failed")}`,
                    );
                }
            } else if (parsed.kharcha_session_id) {
                const res = await resolveQRCode(parsed.kharcha_session_id);

                if (res.success) {
                    navigate("/pay", {
                        state: res.qr,
                    });
                }
            } else if (parsed.type === "dynamic_qr") {
                // Resolve the dynamic QR from the server to get merchant + payment details
                setProcessing({ label: "Reading merchant QR…" });
                try {
                    const data = await resolveQRCode(parsed.qr_id);
                    const qr = data.qr;
                    const params = new URLSearchParams({
                        id: qr.merchant.account_id,
                        name: qr.merchant.name,
                        qr_id: qr.qr_id,
                    });
                    if (qr.amount)            params.set("amount", String(qr.amount));
                    if (qr.note)              params.set("note", qr.note);
                    if (qr.default_category)  params.set("default_category_id", String(qr.default_category.category_id));
                    if (qr.default_category)  params.set("default_category_name", qr.default_category.name);
                    onClose();
                    navigate(`/send?${params.toString()}`);
                } catch (e) {
                    setProcessing({ label: e.message || "QR not found." });
                    await new Promise((r) => setTimeout(r, 2000));
                    setProcessing(null);
                    resume?.();
                }
            } else {
                setProcessing({ label: "Loading payment…" });
                // Brief pause so the check animation is visible
                await new Promise((r) => setTimeout(r, 420));
                const params = new URLSearchParams({ id: parsed.id });
                if (parsed.name)   params.set("name", parsed.name);
                if (parsed.amount) params.set("amount", String(parsed.amount));
                if (parsed.note)   params.set("note", parsed.note);
                onClose();
                navigate(`/send?${params.toString()}`);
            }
        },
        [navigate, onClose],
    );

    if (!open) return null;

    return createPortal(
        <div className="qrs__backdrop" role="dialog" aria-modal="true">
            {/* Close */}
            <button
                className="qrs__close"
                onClick={onClose}
                aria-label="Close scanner"
            >
                <CloseIcon />
            </button>

            {/* Title */}
            <div className="qrs__titlebar">
                <span className="qrs__title">
                    {mode === "scan" ? "Scan QR Code" : "My QR Code"}
                </span>
            </div>

            {/* Body */}
            <div className="qrs__body">
                {processing ? (
                    <ProcessingScreen label={processing.label} />
                ) : mode === "scan" ? (
                    <CameraScanner onDetect={handleDetect} />
                ) : (
                    <MyQRCode />
                )}
            </div>

            {/* Toggle pill at bottom */}
            {!processing && (
                <div className="qrs__footer">
                    <button
                        className="qrs__toggle"
                        onClick={() =>
                            setMode((m) => (m === "scan" ? "myqr" : "scan"))
                        }
                    >
                        {mode === "scan" ? (
                            <>
                                <UserIcon /> Show My QR Code
                            </>
                        ) : (
                            <>
                                <ScanIcon /> Scan QR Code
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>,
        document.body,
    );
}