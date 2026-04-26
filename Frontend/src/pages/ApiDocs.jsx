import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ApiDocs.css";

const BASE_URL = import.meta.env.VITE_API_URL;

// ─── Code block with copy ────────────────────────────────────
function Code({ children, lang = "bash" }) {
    const [copied, setCopied] = useState(false);
    function handleCopy() {
        navigator.clipboard.writeText(children.trim()).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }
    return (
        <div className="docs__code-wrap">
            <div className="docs__code-header">
                <span className="docs__code-lang">{lang}</span>
                <button className="docs__copy-btn" onClick={handleCopy}>
                    {copied ? "✓ Copied" : "Copy"}
                </button>
            </div>
            <pre className="docs__code">
                <code>{children.trim()}</code>
            </pre>
        </div>
    );
}

// ─── Tabs ─────────────────────────────────────────────────────
function Tabs({ tabs, children }) {
    const [active, setActive] = useState(0);
    const items = Array.isArray(children) ? children : [children];
    return (
        <div className="docs__tabs">
            <div className="docs__tab-list">
                {tabs.map((t, i) => (
                    <button
                        key={t}
                        className={`docs__tab${active === i ? " docs__tab--active" : ""}`}
                        onClick={() => setActive(i)}
                    >
                        {t}
                    </button>
                ))}
            </div>
            <div className="docs__tab-panel">{items[active]}</div>
        </div>
    );
}

// ─── Badge ────────────────────────────────────────────────────
function Badge({ method }) {
    return (
        <span className={`docs__badge docs__badge--${method.toLowerCase()}`}>
            {method}
        </span>
    );
}

// ─── Param table ─────────────────────────────────────────────
function ParamTable({ params }) {
    return (
        <div className="docs__param-table-wrap">
            <table className="docs__param-table">
                <thead>
                    <tr>
                        <th>Parameter</th>
                        <th>Type</th>
                        <th>Required</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    {params.map((p) => (
                        <tr key={p.name}>
                            <td>
                                <code className="docs__inline-code">
                                    {p.name}
                                </code>
                            </td>
                            <td>
                                <span className="docs__type">{p.type}</span>
                            </td>
                            <td>
                                <span
                                    className={`docs__req-badge${p.required ? "" : " docs__req-badge--opt"}`}
                                >
                                    {p.required ? "Required" : "Optional"}
                                </span>
                            </td>
                            <td>{p.desc}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Section anchor ──────────────────────────────────────────
function Section({ id, children }) {
    return (
        <section id={id} className="docs__section">
            {children}
        </section>
    );
}

// ─── Nav items ───────────────────────────────────────────────
const NAV = [
    { id: "overview", label: "Overview" },
    { id: "auth", label: "Authentication" },
    { id: "flow-dynamic", label: "Dynamic QR Code", indent: true },
    { id: "flow-hosted", label: "Hosted Payment Page", indent: true },
    { id: "flow-card", label: "Kharcha Card (RFID)", indent: true },
    { id: "webhooks", label: "Webhooks" },
    { id: "polling", label: "Polling Status" },
    { id: "errors", label: "Error Reference" },
];

// ─── Main page ────────────────────────────────────────────────
export default function ApiDocs() {
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState("overview");

    function scrollTo(id) {
        setActiveSection(id);
        document
            .getElementById(id)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    return (
        <div className="docs__root">
            {/* ── Sidebar ── */}
            <aside className="docs__sidebar">
                <button
                    className="docs__sidebar-back"
                    onClick={() => navigate(-1)}
                >
                    ← Back
                </button>
                <div className="docs__sidebar-brand">
                    <span className="docs__sidebar-logo">K</span>
                    <span className="docs__sidebar-title">Kharcha API</span>
                </div>
                <p className="docs__sidebar-version">v1.0 · Payments</p>
                <nav className="docs__nav">
                    {NAV.map((item) => (
                        <button
                            key={item.id}
                            className={`docs__nav-item${item.indent ? " docs__nav-item--indent" : ""}${activeSection === item.id ? " docs__nav-item--active" : ""}`}
                            onClick={() => scrollTo(item.id)}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* ── Content ── */}
            <main className="docs__content">
                {/* ══════════════════════════════════════════════
                    OVERVIEW
                ══════════════════════════════════════════════ */}
                <Section id="overview">
                    <div className="docs__hero">
                        <h1 className="docs__hero-title">
                            Kharcha Payment Integration
                        </h1>
                        <p className="docs__hero-sub">
                            Accept payments from Kharcha wallet users on your
                            website or app. Two integration modes — choose what
                            fits your stack.
                        </p>
                    </div>

                    <div className="docs__flow-cards">
                        <div
                            className="docs__flow-card"
                            onClick={() => scrollTo("flow-dynamic")}
                        >
                            <div className="docs__flow-card-icon">📲</div>
                            <div>
                                <p className="docs__flow-card-title">
                                    Dynamic QR Code
                                </p>
                                <p className="docs__flow-card-desc">
                                    Generate a per-transaction QR. Display it on
                                    your checkout page. Customer scans with
                                    Kharcha app. Your server gets a webhook when
                                    paid.
                                </p>
                                <span className="docs__flow-card-link">
                                    See integration →
                                </span>
                            </div>
                        </div>
                        <div
                            className="docs__flow-card"
                            onClick={() => scrollTo("flow-hosted")}
                        >
                            <div className="docs__flow-card-icon">🔗</div>
                            <div>
                                <p className="docs__flow-card-title">
                                    Hosted Payment Page
                                </p>
                                <p className="docs__flow-card-desc">
                                    Redirect the user to Kharcha's secure
                                    checkout. They log in, pay, and get bounced
                                    back to your site with a success token.
                                </p>
                                <span className="docs__flow-card-link">
                                    See integration →
                                </span>
                            </div>
                        </div>
                        <div
                            className="docs__flow-card"
                            onClick={() => scrollTo("flow-card")}
                        >
                            <div className="docs__flow-card-icon">💳</div>
                            <div>
                                <p className="docs__flow-card-title">
                                    Kharcha Card (RFID POS)
                                </p>
                                <p className="docs__flow-card-desc">
                                    Accept contactless payments in-store. Customer
                                    taps their physical Kharcha card on your
                                    RC522 reader; your terminal charges their
                                    wallet instantly via API key.
                                </p>
                                <span className="docs__flow-card-link">
                                    See integration →
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="docs__base-url-bar">
                        <span className="docs__base-url-label">Base URL</span>
                        <code className="docs__base-url-value">{BASE_URL}</code>
                    </div>
                </Section>

                {/* ══════════════════════════════════════════════
                    AUTHENTICATION
                ══════════════════════════════════════════════ */}
                <Section id="auth">
                    <h2 className="docs__h2">Authentication</h2>
                    <p className="docs__p">
                        All server-side API calls require your{" "}
                        <strong>API Key</strong> sent in the{" "}
                        <code className="docs__inline-code">X-API-Key</code>{" "}
                        header. You can create and manage keys in your Kharcha
                        organisation dashboard under
                        <strong> QR Codes &amp; API Keys</strong>.
                    </p>
                    <Code lang="bash">{`
curl ${BASE_URL}/api/org/qr-codes/payments/create \\
  -H "X-API-Key: kh_live_xxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"amount": 500, "note": "Order #42"}'
                    `}</Code>
                    <div className="docs__callout docs__callout--warn">
                        <strong>Keep your API key secret.</strong> Never expose
                        it in frontend JavaScript or mobile apps. All calls
                        using this key must be made from your backend server.
                    </div>
                </Section>

                {/* ══════════════════════════════════════════════
                    FLOW 1 — DYNAMIC QR
                ══════════════════════════════════════════════ */}
                <Section id="flow-dynamic">
                    <h2 className="docs__h2">
                        <span className="docs__flow-badge docs__flow-badge--1">
                            Flow 1
                        </span>
                        Dynamic QR Code
                    </h2>
                    <p className="docs__p">
                        Your server creates a payment session, generates a QR
                        code, and displays it on your checkout page. The user
                        scans with their Kharcha app and pays. Your server is
                        notified instantly via webhook — or you can poll for
                        status.
                    </p>

                    <div className="docs__steps-list">
                        <div className="docs__step">
                            <span className="docs__step-num">1</span>
                            <span>
                                Your backend creates a payment session with
                                amount + webhook URL
                            </span>
                        </div>
                        <div className="docs__step">
                            <span className="docs__step-num">2</span>
                            <span>
                                You render the QR code on your checkout page
                                using the returned{" "}
                                <code className="docs__inline-code">
                                    qr_payload
                                </code>
                            </span>
                        </div>
                        <div className="docs__step">
                            <span className="docs__step-num">3</span>
                            <span>
                                Customer opens Kharcha app, scans the QR, and
                                confirms payment
                            </span>
                        </div>
                        <div className="docs__step">
                            <span className="docs__step-num">4</span>
                            <span>
                                Kharcha POSTs a webhook to your server and
                                updates the session status to{" "}
                                <code className="docs__inline-code">
                                    success
                                </code>
                            </span>
                        </div>
                    </div>

                    {/* Create session */}
                    <h3 className="docs__h3">
                        <Badge method="POST" />{" "}
                        <code>/api/org/qr-codes/payments/create</code>
                    </h3>
                    <p className="docs__p">
                        Creates a new payment session. Returns a{" "}
                        <code className="docs__inline-code">session_id</code>{" "}
                        and the raw QR payload to encode.
                    </p>

                    <ParamTable
                        params={[
                            {
                                name: "amount",
                                type: "number",
                                required: true,
                                desc: "Amount in NPR (must be > 0).",
                            },
                            {
                                name: "note",
                                type: "string",
                                required: false,
                                desc: "Short description shown to the payer (e.g. 'Order #42').",
                            },
                            {
                                name: "callback_url",
                                type: "string",
                                required: false,
                                desc: "Webhook URL. Kharcha POSTs to this when the payment succeeds.",
                            },
                        ]}
                    />

                    <Tabs tabs={["cURL", "JavaScript", "Python"]}>
                        <Code lang="bash">{`
curl -X POST ${BASE_URL}/api/org/qr-codes/payments/create \\
  -H "X-API-Key: kh_live_xxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 1500,
    "note": "Order #42 — 2x items",
    "callback_url": "https://yoursite.com/kharcha/webhook"
  }'
                        `}</Code>
                        <Code lang="javascript">{`
const res = await fetch("${BASE_URL}/api/org/qr-codes/payments/create", {
  method: "POST",
  headers: {
    "X-API-Key": "kh_live_xxxxxxxxxxxxxxxxxxxx",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    amount: 1500,
    note: "Order #42 — 2x items",
    callback_url: "https://yoursite.com/kharcha/webhook",
  }),
});
const { session_id, qr_payload } = await res.json();
                        `}</Code>
                        <Code lang="python">{`
import requests, json

resp = requests.post(
    "${BASE_URL}/api/org/qr-codes/payments/create",
    headers={
        "X-API-Key": "kh_live_xxxxxxxxxxxxxxxxxxxx",
        "Content-Type": "application/json",
    },
    json={
        "amount": 1500,
        "note": "Order #42 — 2x items",
        "callback_url": "https://yoursite.com/kharcha/webhook",
    },
)
data = resp.json()
session_id = data["session_id"]
qr_payload = data["qr_payload"]
                        `}</Code>
                    </Tabs>

                    <h4 className="docs__h4">Response</h4>
                    <Code lang="json">{`
{
  "success": true,
  "session_id": "f3a1b2c4-...",
  "qr_payload": "{\\"kharcha_qr_id\\":\\"f3a1b2c4-...\\"}"
}
                    `}</Code>

                    {/* Render QR */}
                    <h3 className="docs__h3">Rendering the QR code</h3>
                    <p className="docs__p">
                        Pass{" "}
                        <code className="docs__inline-code">qr_payload</code>{" "}
                        directly to any QR-code library. The string is already
                        valid JSON — just encode it as-is.
                    </p>
                    <Tabs tabs={["React", "Vanilla JS"]}>
                        <Code lang="jsx">{`
import QRCode from "qrcode";
import { useEffect, useRef } from "react";

function KharchaQR({ qrPayload }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current)
      QRCode.toCanvas(ref.current, qrPayload, { width: 240, margin: 2 });
  }, [qrPayload]);
  return <canvas ref={ref} />;
}
                        `}</Code>
                        <Code lang="javascript">{`
import QRCode from "qrcode";

// qrPayload is the string returned by the API
QRCode.toCanvas(document.getElementById("qr-canvas"), qrPayload, {
  width: 240,
  margin: 2,
});
                        `}</Code>
                    </Tabs>

                    {/* Poll status */}
                    <h3 className="docs__h3">
                        <Badge method="GET" />{" "}
                        <code>
                            /api/org/qr-codes/payments/status/:session_id
                        </code>
                    </h3>
                    <p className="docs__p">
                        Poll this endpoint every 2–3 seconds to detect payment
                        without a webhook. Requires your API key.
                    </p>
                    <Code lang="javascript">{`
async function pollUntilPaid(sessionId, onPaid) {
  const interval = setInterval(async () => {
    const res = await fetch(
      \`${BASE_URL}/api/org/qr-codes/payments/status/\${sessionId}\`,
      { headers: { "X-API-Key": "kh_live_xxxxxxxxxxxxxxxxxxxx" } }
    );
    const { status } = await res.json();

    if (status === "success") {
      clearInterval(interval);
      onPaid(); // mark order as paid in your system
    } else if (status === "expired") {
      clearInterval(interval);
      // QR has expired — show a "refresh" button
    }
  }, 2500);

  return () => clearInterval(interval); // call to stop polling
}
                    `}</Code>
                    <h4 className="docs__h4">Status values</h4>
                    <div className="docs__status-list">
                        <div className="docs__status-row">
                            <code className="docs__status-badge docs__status-badge--pending">
                                pending
                            </code>
                            <span>Session is open, waiting for payment.</span>
                        </div>
                        <div className="docs__status-row">
                            <code className="docs__status-badge docs__status-badge--success">
                                success
                            </code>
                            <span>
                                Payment received. Mark the order as paid.
                            </span>
                        </div>
                        <div className="docs__status-row">
                            <code className="docs__status-badge docs__status-badge--expired">
                                expired
                            </code>
                            <span>
                                Session timed out (5 minutes). Create a new
                                session.
                            </span>
                        </div>
                    </div>
                </Section>

                {/* ══════════════════════════════════════════════
                    FLOW 2 — HOSTED PAYMENT PAGE
                ══════════════════════════════════════════════ */}
                <Section id="flow-hosted">
                    <h2 className="docs__h2">
                        <span className="docs__flow-badge docs__flow-badge--2">
                            Flow 2
                        </span>
                        Hosted Payment Page
                    </h2>
                    <p className="docs__p">
                        Like Khalti or eSewa — redirect the user to Kharcha's
                        secure checkout. They log in with their Kharcha account,
                        enter their MPIN, and get redirected back to your site
                        with a signed result. No QR code needed.
                    </p>

                    <div className="docs__steps-list">
                        <div className="docs__step">
                            <span className="docs__step-num">1</span>
                            <span>
                                Your backend creates a payment session and gets
                                a{" "}
                                <code className="docs__inline-code">
                                    session_id
                                </code>
                            </span>
                        </div>
                        <div className="docs__step">
                            <span className="docs__step-num">2</span>
                            <span>
                                Redirect the user to Kharcha's checkout URL with
                                your{" "}
                                <code className="docs__inline-code">
                                    return_url
                                </code>
                            </span>
                        </div>
                        <div className="docs__step">
                            <span className="docs__step-num">3</span>
                            <span>
                                User logs in (if needed), reviews details,
                                enters MPIN, and pays
                            </span>
                        </div>
                        <div className="docs__step">
                            <span className="docs__step-num">4</span>
                            <span>
                                Kharcha redirects back to your{" "}
                                <code className="docs__inline-code">
                                    return_url
                                </code>{" "}
                                with status + transaction ID
                            </span>
                        </div>
                    </div>

                    {/* Step 1 */}
                    <h3 className="docs__h3">
                        Step 1 — Create a payment session
                    </h3>
                    <p className="docs__p">
                        Same endpoint as the Dynamic QR flow. The{" "}
                        <code className="docs__inline-code">session_id</code> is
                        valid for 5 minutes.
                    </p>
                    <Code lang="javascript">{`
// On your server (Node.js example)
const res = await fetch("${BASE_URL}/api/org/qr-codes/payments/create", {
  method: "POST",
  headers: {
    "X-API-Key": process.env.KHARCHA_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ amount: 1500, note: "Order #42" }),
});
const { session_id } = await res.json();
// Store session_id in your DB, linked to the order
                    `}</Code>

                    {/* Step 2 */}
                    <h3 className="docs__h3">Step 2 — Redirect the user</h3>
                    <p className="docs__p">
                        Build the checkout URL and redirect. The{" "}
                        <code className="docs__inline-code">return_url</code> is
                        where Kharcha will redirect after payment — use a URL on
                        your server that can verify the result.
                    </p>
                    <Code lang="javascript">{`
const checkoutUrl = new URL("https://kharcha.app/pay/" + session_id);
checkoutUrl.searchParams.set("return_url", "https://yoursite.com/payment/callback");

// In Express: res.redirect(checkoutUrl.toString())
// In a browser: window.location.href = checkoutUrl.toString()
                    `}</Code>

                    {/* Step 3 */}
                    <h3 className="docs__h3">
                        Step 3 — Handle the redirect back
                    </h3>
                    <p className="docs__p">
                        Kharcha appends these query parameters to your{" "}
                        <code className="docs__inline-code">return_url</code>:
                    </p>
                    <ParamTable
                        params={[
                            {
                                name: "status",
                                type: "string",
                                required: true,
                                desc: '"success" | "cancelled"',
                            },
                            {
                                name: "transaction_id",
                                type: "string",
                                required: false,
                                desc: "Kharcha transaction ID. Only present on success.",
                            },
                            {
                                name: "session_id",
                                type: "string",
                                required: true,
                                desc: "The session_id you created in Step 1.",
                            },
                            {
                                name: "amount",
                                type: "number",
                                required: false,
                                desc: "Confirmed amount in NPR. Only present on success.",
                            },
                        ]}
                    />
                    <Code lang="javascript">{`
// https://yoursite.com/payment/callback
//   ?status=success
//   &transaction_id=txn_abc123
//   &session_id=f3a1b2c4-...
//   &amount=1500

app.get("/payment/callback", async (req, res) => {
  const { status, transaction_id, session_id, amount } = req.query;

  if (status === "success") {
    // 1. Look up the order linked to this session_id in your DB
    // 2. Verify the amount matches what you expected
    // 3. Mark the order as paid
    await db.orders.markPaid({ session_id, transaction_id });
    return res.redirect("/order/confirmation");
  }

  // Payment was cancelled
  return res.redirect("/checkout?cancelled=1");
});
                    `}</Code>

                    <div className="docs__callout docs__callout--info">
                        <strong>Always verify on your server.</strong> Don't
                        mark an order as paid based on the redirect alone —
                        cross-check the{" "}
                        <code className="docs__inline-code">session_id</code>{" "}
                        against your database to confirm the amount matches what
                        you expected.
                    </div>
                </Section>

                {/* ══════════════════════════════════════════════
                    KHARCHA CARD (RFID POS)
                ══════════════════════════════════════════════ */}
                <Section id="flow-card">
                    <h2 className="docs__h2">Kharcha Card (RFID POS)</h2>
                    <p className="docs__p">
                        Accept contactless payments from Kharcha physical cards
                        at your point-of-sale terminal. The customer taps their
                        NFC/RFID card on an RC522 reader; your terminal sends
                        the card UID and amount to Kharcha, which atomically
                        debits the cardholder's wallet and credits yours.
                    </p>

                    <div className="docs__callout docs__callout--info">
                        <strong>API key required.</strong> POS terminals
                        authenticate with an{" "}
                        <code className="docs__inline-code">X-API-Key</code>{" "}
                        header — not a user JWT. Generate a key from your
                        organisation dashboard under <em>API Keys</em>.
                    </div>

                    {/* Step 1 */}
                    <h3 className="docs__h3">Step 1 — Read the card UID</h3>
                    <p className="docs__p">
                        When the customer taps, your RC522 reader returns a
                        card UID (4 or 7 bytes, uppercase hex e.g.{" "}
                        <code className="docs__inline-code">A3B2C1D0</code>).
                        First, look up the card to confirm it is active and
                        retrieve the internal{" "}
                        <code className="docs__inline-code">card_id</code>{" "}
                        needed for the charge call.
                    </p>
                    <Code lang="http">{`GET ${BASE_URL}/api/cards/pos/lookup/:rfid_uid
X-API-Key: kh_live_xxxxxxxxxxxx`}</Code>
                    <Code lang="json">{`// 200 OK — card is active
{
  "success": true,
  "card": {
    "card_id": "A3B2C1D0",
    "account_id": "uuid-of-cardholder",
    "card_number": "7333300000000012",
    "status": "active",
    "daily_limit": 5000
  }
}

// 403 — card is blocked or inactive
{ "success": false, "message": "Card is blocked. Payment declined." }

// 404 — UID not registered
{ "success": false, "message": "RFID card not found." }`}</Code>

                    {/* Step 2 */}
                    <h3 className="docs__h3">Step 2 — Charge the card</h3>
                    <p className="docs__p">
                        Submit the charge using the{" "}
                        <code className="docs__inline-code">card_id</code>{" "}
                        returned in Step 1. Kharcha checks the daily limit,
                        debits the cardholder, and credits your wallet in a
                        single atomic transaction.
                    </p>
                    <ParamTable
                        params={[
                            {
                                name: "X-API-Key",
                                type: "header",
                                required: true,
                                desc: "Your organisation API key.",
                            },
                            {
                                name: "card_id",
                                type: "string",
                                required: true,
                                desc: "RFID UID from the lookup response (uppercase hex).",
                            },
                            {
                                name: "amount",
                                type: "number",
                                required: true,
                                desc: "Amount in NPR. Minimum NPR 1.",
                            },
                            {
                                name: "remarks",
                                type: "string",
                                required: false,
                                desc: "Optional note shown in the cardholder's transaction history.",
                            },
                        ]}
                    />
                    <Tabs tabs={["Node.js", "Python", "cURL"]}>
                        <Code lang="javascript">{`const res = await fetch("${BASE_URL}/api/pos/charge", {
  method: "POST",
  headers: {
    "X-API-Key": process.env.KHARCHA_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    card_id: "A3B2C1D0",
    amount: 850,
    remarks: "Coffee & pastry",
  }),
});
const data = await res.json();
if (data.success) {
  console.log("Charged!", data.transaction.transaction_id);
  console.log("Balance after:", data.transaction.balance_after, "NPR");
}`}</Code>
                        <Code lang="python">{`import requests

resp = requests.post(
    "${BASE_URL}/api/pos/charge",
    headers={
        "X-API-Key": os.environ["KHARCHA_API_KEY"],
        "Content-Type": "application/json",
    },
    json={"card_id": "A3B2C1D0", "amount": 850, "remarks": "Coffee & pastry"},
)
data = resp.json()
if data["success"]:
    print("Charged!", data["transaction"]["transaction_id"])`}</Code>
                        <Code lang="bash">{`curl -X POST ${BASE_URL}/api/pos/charge \\
  -H "X-API-Key: kh_live_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"card_id":"A3B2C1D0","amount":850,"remarks":"Coffee & pastry"}'`}</Code>
                    </Tabs>

                    <Code lang="json">{`// 200 OK — payment successful
{
  "success": true,
  "message": "Payment successful.",
  "transaction": {
    "transaction_id": "txn_abc123def456",
    "amount": 850,
    "currency": "NPR",
    "balance_after": 4150,
    "merchant": { "account_id": "uuid", "display_name": "Your Café" },
    "remarks": "Coffee & pastry",
    "method": "Kharcha Card",
    "status": "completed"
  }
}

// 400 — insufficient balance
{ "success": false, "message": "Insufficient wallet balance." }

// 400 — daily limit reached
{ "success": false, "message": "Card daily limit reached." }

// 403 — card inactive/blocked
{ "success": false, "message": "Card is blocked." }`}</Code>

                    <div className="docs__callout docs__callout--warn">
                        <strong>Always verify the lookup first.</strong> A card
                        that was active at lookup may become blocked between
                        Steps 1 and 2 — the charge endpoint will return{" "}
                        <code className="docs__inline-code">403</code> in that
                        case. Display the error on your terminal and ask the
                        customer to contact support.
                    </div>
                </Section>

                {/* ══════════════════════════════════════════════
                    WEBHOOKS
                ══════════════════════════════════════════════ */}
                <Section id="webhooks">
                    <h2 className="docs__h2">Webhooks</h2>
                    <p className="docs__p">
                        When a QR payment succeeds, Kharcha sends an HTTP{" "}
                        <code className="docs__inline-code">POST</code> to your{" "}
                        <code className="docs__inline-code">callback_url</code>{" "}
                        (if you provided one). Webhooks are fire-and-forget —
                        Kharcha does not retry on failure.
                    </p>

                    <h3 className="docs__h3">Request headers</h3>
                    <Code lang="http">{`
POST https://yoursite.com/kharcha/webhook
Content-Type: application/json
X-Kharcha-Event: qr_payment
                    `}</Code>

                    <h3 className="docs__h3">Payload</h3>
                    <Code lang="json">{`
{
  "event": "payment.success",
  "qr_id": "f3a1b2c4-...",
  "transaction_id": "txn_abc123def456",
  "amount": 1500,
  "currency": "NPR",
  "remarks": "Order #42",
  "timestamp": "2026-04-12T10:23:45.000Z"
}
                    `}</Code>

                    <h3 className="docs__h3">Handling the webhook</h3>
                    <Code lang="javascript">{`
app.post("/kharcha/webhook", express.json(), async (req, res) => {
  // 1. Acknowledge quickly — Kharcha times out after 8 seconds
  res.status(200).send("OK");

  // 2. Process asynchronously
  const { event, qr_id, transaction_id, amount } = req.body;
  if (event === "payment.success") {
    await db.orders.markPaid({ session_id: qr_id, transaction_id });
  }
});
                    `}</Code>

                    <div className="docs__callout docs__callout--warn">
                        Respond with{" "}
                        <code className="docs__inline-code">2xx</code>{" "}
                        immediately before doing any slow work. Kharcha's
                        webhook has an 8-second timeout and does not retry.
                    </div>
                </Section>

                {/* ══════════════════════════════════════════════
                    POLLING
                ══════════════════════════════════════════════ */}
                <Section id="polling">
                    <h2 className="docs__h2">Polling Status</h2>
                    <p className="docs__p">
                        If you can't receive webhooks (e.g. localhost dev,
                        serverless cold starts), poll the status endpoint from
                        your frontend or server instead.
                    </p>
                    <h3 className="docs__h3">
                        <Badge method="GET" />{" "}
                        <code>
                            /api/org/qr-codes/payments/status/:session_id
                        </code>
                    </h3>
                    <ParamTable
                        params={[
                            {
                                name: "X-API-Key",
                                type: "header",
                                required: true,
                                desc: "Your organisation API key.",
                            },
                            {
                                name: "session_id",
                                type: "path",
                                required: true,
                                desc: "The session ID from the create call.",
                            },
                        ]}
                    />
                    <Code lang="json">{`
// Response
{
  "success": true,
  "status": "pending",   // "pending" | "success" | "expired"
  "amount": 1500
}
                    `}</Code>
                    <div className="docs__callout docs__callout--info">
                        Poll at most every 2 seconds. Sessions expire after 5
                        minutes — if you get
                        <code className="docs__inline-code"> expired</code>,
                        create a new session and show a fresh QR.
                    </div>
                </Section>

                {/* ══════════════════════════════════════════════
                    ERRORS
                ══════════════════════════════════════════════ */}
                <Section id="errors">
                    <h2 className="docs__h2">Error Reference</h2>
                    <p className="docs__p">
                        All error responses follow the same shape:
                    </p>
                    <Code lang="json">{`
{
  "success": false,
  "message": "Human-readable error message"
}
                    `}</Code>

                    <div className="docs__error-table-wrap">
                        <table className="docs__param-table">
                            <thead>
                                <tr>
                                    <th>HTTP Code</th>
                                    <th>Meaning</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <code className="docs__inline-code">
                                            400
                                        </code>
                                    </td>
                                    <td>
                                        Invalid request body (missing amount,
                                        bad URL, etc.)
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code className="docs__inline-code">
                                            401
                                        </code>
                                    </td>
                                    <td>Missing or invalid API key</td>
                                </tr>
                                <tr>
                                    <td>
                                        <code className="docs__inline-code">
                                            403
                                        </code>
                                    </td>
                                    <td>
                                        Authenticated but not authorised (e.g.
                                        wrong org account)
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code className="docs__inline-code">
                                            404
                                        </code>
                                    </td>
                                    <td>Session not found</td>
                                </tr>
                                <tr>
                                    <td>
                                        <code className="docs__inline-code">
                                            410
                                        </code>
                                    </td>
                                    <td>Session expired or already used</td>
                                </tr>
                                <tr>
                                    <td>
                                        <code className="docs__inline-code">
                                            500
                                        </code>
                                    </td>
                                    <td>
                                        Internal server error — contact support
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </Section>
            </main>
        </div>
    );
}