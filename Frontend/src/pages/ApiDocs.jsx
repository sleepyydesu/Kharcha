import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ApiDocs.css";

const BASE_URL = "https://api.kharcha.app";

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
            <pre className="docs__code"><code>{children.trim()}</code></pre>
        </div>
    );
}

function Tabs({ tabs, children }) {
    const [active, setActive] = useState(0);
    const items = Array.isArray(children) ? children : [children];
    return (
        <div className="docs__tabs">
            <div className="docs__tab-list">
                {tabs.map((t, i) => (
                    <button key={t}
                        className={`docs__tab${active === i ? " docs__tab--active" : ""}`}
                        onClick={() => setActive(i)}>
                        {t}
                    </button>
                ))}
            </div>
            <div className="docs__tab-panel">{items[active]}</div>
        </div>
    );
}

function Badge({ method }) {
    return <span className={`docs__badge docs__badge--${method.toLowerCase()}`}>{method}</span>;
}

function ParamTable({ params }) {
    return (
        <div className="docs__param-table-wrap">
            <table className="docs__param-table">
                <thead>
                    <tr><th>Parameter</th><th>Type</th><th>Required</th><th>Description</th></tr>
                </thead>
                <tbody>
                    {params.map((p) => (
                        <tr key={p.name}>
                            <td><code className="docs__inline-code">{p.name}</code></td>
                            <td><span className="docs__type">{p.type}</span></td>
                            <td>
                                <span className={`docs__req-badge${p.required ? "" : " docs__req-badge--opt"}`}>
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

function Section({ id, children }) {
    return <section id={id} className="docs__section">{children}</section>;
}

const NAV = [
    { id: "overview",      label: "Overview" },
    { id: "auth",          label: "Authentication" },
    { id: "flow-portal",   label: "Payment Portal",   indent: true },
    { id: "flow-dynamic",  label: "Dynamic QR Code",  indent: true },
    { id: "flow-hosted",   label: "Hosted Page",      indent: true },
    { id: "flow-card",     label: "Kharcha Card (RFID)", indent: true },
    { id: "flow-credit",   label: "Card Number + CVV", indent: true },
    { id: "webhooks",      label: "Webhooks" },
    { id: "polling",       label: "Polling Status" },
    { id: "errors",        label: "Error Reference" },
];

export default function ApiDocs() {
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState("overview");

    function scrollTo(id) {
        setActiveSection(id);
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    return (
        <div className="docs__root">
            {/* Sidebar */}
            <aside className="docs__sidebar">
                <button className="docs__sidebar-back" onClick={() => navigate(-1)}>← Back</button>
                <div className="docs__sidebar-brand">
                    <span className="docs__sidebar-logo">K</span>
                    <span className="docs__sidebar-title">Kharcha API</span>
                </div>
                <p className="docs__sidebar-version">v1.0 · Payments</p>
                <nav className="docs__nav">
                    {NAV.map((item) => (
                        <button key={item.id}
                            className={`docs__nav-item${item.indent ? " docs__nav-item--indent" : ""}${activeSection === item.id ? " docs__nav-item--active" : ""}`}
                            onClick={() => scrollTo(item.id)}>
                            {item.label}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Content */}
            <main className="docs__content">

                {/* ══ OVERVIEW ══════════════════════════════════════ */}
                <Section id="overview">
                    <div className="docs__hero">
                        <h1 className="docs__hero-title">Kharcha Payment Integration</h1>
                        <p className="docs__hero-sub">
                            Accept payments from Kharcha wallet users on your website or app.
                            Multiple integration modes — choose what fits your stack.
                        </p>
                    </div>

                    <div className="docs__flow-cards">
                        <div className="docs__flow-card" onClick={() => scrollTo("flow-portal")}>
                            <div className="docs__flow-card-icon">🔗</div>
                            <div>
                                <p className="docs__flow-card-title">Payment Portal</p>
                                <p className="docs__flow-card-desc">
                                    Redirect the customer to Kharcha's hosted checkout page.
                                    They log in with email + OTP, enter their MPIN, and get bounced
                                    back to your site. No QR code, no card details.
                                </p>
                                <span className="docs__flow-card-link">See integration →</span>
                            </div>
                        </div>
                        <div className="docs__flow-card" onClick={() => scrollTo("flow-dynamic")}>
                            <div className="docs__flow-card-icon">📲</div>
                            <div>
                                <p className="docs__flow-card-title">Dynamic QR Code</p>
                                <p className="docs__flow-card-desc">
                                    Generate a per-transaction QR. Display it on your checkout page.
                                    Customer scans with Kharcha app. Your server gets a webhook when paid.
                                </p>
                                <span className="docs__flow-card-link">See integration →</span>
                            </div>
                        </div>
                        <div className="docs__flow-card" onClick={() => scrollTo("flow-card")}>
                            <div className="docs__flow-card-icon">💳</div>
                            <div>
                                <p className="docs__flow-card-title">Kharcha Card (RFID POS)</p>
                                <p className="docs__flow-card-desc">
                                    Accept contactless payments in-store. Customer taps their physical
                                    Kharcha card on your RC522 reader; your terminal charges their wallet
                                    instantly via API key.
                                </p>
                                <span className="docs__flow-card-link">See integration →</span>
                            </div>
                        </div>
                        <div className="docs__flow-card" onClick={() => scrollTo("flow-credit")}>
                            <div className="docs__flow-card-icon">🔢</div>
                            <div>
                                <p className="docs__flow-card-title">Card Number + CVV</p>
                                <p className="docs__flow-card-desc">
                                    Online checkout integration. Customer enters their 16-digit card
                                    number and CVV; your server verifies and charges via API key —
                                    no redirect required.
                                </p>
                                <span className="docs__flow-card-link">See integration →</span>
                            </div>
                        </div>
                    </div>

                    <div className="docs__base-url-bar">
                        <span className="docs__base-url-label">Base URL</span>
                        <code className="docs__base-url-value">{BASE_URL}</code>
                    </div>
                </Section>

                {/* ══ AUTHENTICATION ════════════════════════════════ */}
                <Section id="auth">
                    <h2 className="docs__h2">Authentication</h2>
                    <p className="docs__p">
                        Server-side API calls that create payment sessions or charge cards require your{" "}
                        <strong>API Key</strong> in the{" "}
                        <code className="docs__inline-code">X-API-Key</code> header.
                        Generate and manage keys in your Kharcha organisation dashboard under{" "}
                        <strong>QR Codes &amp; API Keys</strong>.
                    </p>
                    <Code lang="bash">{`curl -X POST ${BASE_URL}/api/pay-portal/sessions/create \\
  -H "X-API-Key: kh_live_xxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"amount": 500, "note": "Order #42"}'`}</Code>
                    <div className="docs__callout docs__callout--warn">
                        <strong>Keep your API key secret.</strong> Never expose it in frontend JavaScript
                        or mobile apps. All calls using this key must come from your backend server.
                    </div>
                </Section>

                {/* ══ FLOW 1 — PAYMENT PORTAL ══════════════════════ */}
                <Section id="flow-portal">
                    <h2 className="docs__h2">
                        <span className="docs__flow-badge docs__flow-badge--1">Flow 1</span>
                        Payment Portal
                    </h2>
                    <p className="docs__p">
                        The simplest integration. Redirect the user to Kharcha's secure hosted
                        checkout page. They sign in with their Kharcha email + OTP (sent by email),
                        review the payment details, enter their MPIN, and are redirected back to
                        your site. No QR scanning, no card numbers.
                    </p>

                    <div className="docs__steps-list">
                        <div className="docs__step">
                            <span className="docs__step-num">1</span>
                            <span>Your backend creates a payment session and receives a <code className="docs__inline-code">session_id</code></span>
                        </div>
                        <div className="docs__step">
                            <span className="docs__step-num">2</span>
                            <span>Redirect the user to <code className="docs__inline-code">kharcha.app/pay/:session_id</code></span>
                        </div>
                        <div className="docs__step">
                            <span className="docs__step-num">3</span>
                            <span>User enters their Kharcha email, receives an OTP, verifies it, and enters their MPIN to pay</span>
                        </div>
                        <div className="docs__step">
                            <span className="docs__step-num">4</span>
                            <span>Kharcha redirects back to your <code className="docs__inline-code">return_url</code> with status + transaction ID</span>
                        </div>
                    </div>

                    {/* Step 1 — create session */}
                    <h3 className="docs__h3">
                        Step 1 — Create a payment session
                    </h3>
                    <h4 className="docs__h4">
                        <Badge method="POST" />{" "}
                        <code>/api/pay-portal/sessions/create</code>
                    </h4>
                    <p className="docs__p">
                        Called server-side with your API key. Creates a standalone payment session
                        and returns a <code className="docs__inline-code">checkout_url</code> ready
                        to redirect the user to.
                    </p>
                    <ParamTable params={[
                        { name: "X-API-Key",        type: "header", required: true,  desc: "Your organisation API key." },
                        { name: "amount",            type: "number", required: true,  desc: "Amount in NPR (must be > 0)." },
                        { name: "note",              type: "string", required: false, desc: "Short description shown to the payer (e.g. 'Order #42')." },
                        { name: "return_url",        type: "string", required: false, desc: "URL Kharcha redirects to after payment or cancellation." },
                        { name: "callback_url",      type: "string", required: false, desc: "Webhook URL. Kharcha POSTs here on successful payment." },
                        { name: "expires_in_minutes",type: "number", required: false, desc: "Session TTL in minutes (default: 30, max: 1440)." },
                    ]} />

                    <Tabs tabs={["cURL", "Node.js", "Python"]}>
                        <Code lang="bash">{`curl -X POST ${BASE_URL}/api/pay-portal/sessions/create \\
  -H "X-API-Key: kh_live_xxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 1500,
    "note": "Order #42 — 2x items",
    "return_url": "https://yoursite.com/payment/callback",
    "callback_url": "https://yoursite.com/kharcha/webhook"
  }'`}</Code>
                        <Code lang="javascript">{`// Node.js (server-side only — never expose API key to the browser)
const res = await fetch("${BASE_URL}/api/pay-portal/sessions/create", {
  method: "POST",
  headers: {
    "X-API-Key": process.env.KHARCHA_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    amount: 1500,
    note: "Order #42 — 2x items",
    return_url: "https://yoursite.com/payment/callback",
    callback_url: "https://yoursite.com/kharcha/webhook",
  }),
});
const { session_id, checkout_url } = await res.json();

// Store session_id in your DB linked to the order, then redirect:
// res.redirect(checkout_url)`}</Code>
                        <Code lang="python">{`import requests, os

resp = requests.post(
    "${BASE_URL}/api/pay-portal/sessions/create",
    headers={
        "X-API-Key": os.environ["KHARCHA_API_KEY"],
        "Content-Type": "application/json",
    },
    json={
        "amount": 1500,
        "note": "Order #42 — 2x items",
        "return_url": "https://yoursite.com/payment/callback",
        "callback_url": "https://yoursite.com/kharcha/webhook",
    },
)
data = resp.json()
session_id   = data["session_id"]
checkout_url = data["checkout_url"]  # redirect the user here`}</Code>
                    </Tabs>

                    <h4 className="docs__h4">Response</h4>
                    <Code lang="json">{`{
  "success": true,
  "session_id": "a1b2c3d4-e5f6-...",
  "checkout_url": "https://kharcha.app/pay/a1b2c3d4-e5f6-...?return_url=...",
  "amount": 1500,
  "expires_at": "2026-04-28T11:30:00.000Z"
}`}</Code>

                    {/* Step 2 — redirect */}
                    <h3 className="docs__h3">Step 2 — Redirect the user</h3>
                    <p className="docs__p">
                        Send the user to the <code className="docs__inline-code">checkout_url</code>{" "}
                        returned above. The URL already includes your <code className="docs__inline-code">return_url</code>{" "}
                        as a query parameter. Kharcha's portal handles the entire auth and payment flow.
                    </p>
                    <Code lang="javascript">{`// Express example
app.post("/checkout", async (req, res) => {
  const { session_id, checkout_url } = await createKharchaSession(req.body.amount);
  await db.orders.update({ orderId: req.body.orderId, kharchaSessionId: session_id });
  res.redirect(checkout_url);
});`}</Code>

                    {/* Step 3 — callback */}
                    <h3 className="docs__h3">Step 3 — Handle the redirect back</h3>
                    <p className="docs__p">
                        Kharcha appends these query parameters to your <code className="docs__inline-code">return_url</code>:
                    </p>
                    <ParamTable params={[
                        { name: "status",         type: "string", required: true,  desc: '"success" | "cancelled"' },
                        { name: "transaction_id", type: "string", required: false, desc: "Kharcha transaction ID. Present only on success." },
                        { name: "session_id",     type: "string", required: true,  desc: "The session_id you created in Step 1. Use this to match the order." },
                    ]} />
                    <Code lang="javascript">{`// https://yoursite.com/payment/callback
//   ?status=success
//   &transaction_id=txn_abc123
//   &session_id=a1b2c3d4-e5f6-...

app.get("/payment/callback", async (req, res) => {
  const { status, transaction_id, session_id } = req.query;

  if (status === "success") {
    // Match session_id to the order you saved in Step 1
    await db.orders.markPaid({ session_id, transaction_id });
    return res.redirect("/order/confirmation");
  }

  // User cancelled
  return res.redirect("/checkout?cancelled=1");
});`}</Code>
                    <div className="docs__callout docs__callout--info">
                        <strong>Always verify on your server.</strong> Match the <code className="docs__inline-code">session_id</code>{" "}
                        from the redirect to the one you saved in Step 1, and confirm the amount
                        matches what you expected — never solely trust the redirect parameters.
                    </div>

                    {/* Portal API reference */}
                    <h3 className="docs__h3">Portal API reference</h3>
                    <p className="docs__p">
                        The following endpoints power the portal page itself. You don't call
                        these directly — they're used by Kharcha's frontend. Documented here
                        for transparency and custom integration.
                    </p>

                    <div className="docs__endpoint-list">
                        <div className="docs__endpoint-row">
                            <Badge method="GET" />
                            <code className="docs__inline-code">/api/pay-portal/:session_id/session</code>
                            <span className="docs__endpoint-desc">Fetch session details (public — no auth)</span>
                        </div>
                        <div className="docs__endpoint-row">
                            <Badge method="POST" />
                            <code className="docs__inline-code">/api/pay-portal/:session_id/send-otp</code>
                            <span className="docs__endpoint-desc">
                                Body: <code className="docs__inline-code">{"{ email }"}</code> — Sends OTP to payer's registered email
                            </span>
                        </div>
                        <div className="docs__endpoint-row">
                            <Badge method="POST" />
                            <code className="docs__inline-code">/api/pay-portal/:session_id/verify-otp</code>
                            <span className="docs__endpoint-desc">
                                Body: <code className="docs__inline-code">{"{ email, otp }"}</code> — Returns a short-lived <code className="docs__inline-code">payment_token</code> (30 min)
                            </span>
                        </div>
                        <div className="docs__endpoint-row">
                            <Badge method="POST" />
                            <code className="docs__inline-code">/api/pay-portal/:session_id/pay</code>
                            <span className="docs__endpoint-desc">
                                Header: <code className="docs__inline-code">X-Payment-Token</code> · Body: <code className="docs__inline-code">{"{ mpin, remarks? }"}</code> — Verifies MPIN and processes transfer
                            </span>
                        </div>
                    </div>

                    <div className="docs__callout docs__callout--info">
                        <strong>No JWT involved.</strong> The portal uses its own isolated auth chain:
                        email → OTP → <code className="docs__inline-code">payment_token</code> → MPIN.
                        Sessions are stored in the <code className="docs__inline-code">payment_sessions</code>{" "}
                        table, completely separate from QR codes.
                    </div>
                </Section>

                {/* ══ FLOW 2 — DYNAMIC QR ══════════════════════════ */}
                <Section id="flow-dynamic">
                    <h2 className="docs__h2">
                        <span className="docs__flow-badge docs__flow-badge--2">Flow 2</span>
                        Dynamic QR Code
                    </h2>
                    <p className="docs__p">
                        Your server creates a payment session, generates a QR code, and displays
                        it on your checkout page. The user scans with their Kharcha app and pays.
                        Your server is notified instantly via webhook — or you can poll for status.
                    </p>
                    <div className="docs__steps-list">
                        <div className="docs__step"><span className="docs__step-num">1</span><span>Your backend creates a payment session with amount + webhook URL</span></div>
                        <div className="docs__step"><span className="docs__step-num">2</span><span>You render the QR code on your checkout page using the returned <code className="docs__inline-code">qr_payload</code></span></div>
                        <div className="docs__step"><span className="docs__step-num">3</span><span>Customer opens Kharcha app, scans the QR, and confirms payment</span></div>
                        <div className="docs__step"><span className="docs__step-num">4</span><span>Kharcha POSTs a webhook to your server and updates the session status to <code className="docs__inline-code">success</code></span></div>
                    </div>

                    <h3 className="docs__h3"><Badge method="POST" />{" "}<code>/api/org/qr-codes/payments/create</code></h3>
                    <ParamTable params={[
                        { name: "amount",       type: "number", required: true,  desc: "Amount in NPR (must be > 0)." },
                        { name: "note",         type: "string", required: false, desc: "Short description shown to the payer." },
                        { name: "callback_url", type: "string", required: false, desc: "Webhook URL. Kharcha POSTs to this when the payment succeeds." },
                    ]} />
                    <Tabs tabs={["cURL", "JavaScript", "Python"]}>
                        <Code lang="bash">{`curl -X POST ${BASE_URL}/api/org/qr-codes/payments/create \\
  -H "X-API-Key: kh_live_xxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"amount": 1500, "note": "Order #42", "callback_url": "https://yoursite.com/kharcha/webhook"}'`}</Code>
                        <Code lang="javascript">{`const res = await fetch("${BASE_URL}/api/org/qr-codes/payments/create", {
  method: "POST",
  headers: { "X-API-Key": "kh_live_xxxxxxxxxxxxxxxxxxxx", "Content-Type": "application/json" },
  body: JSON.stringify({ amount: 1500, note: "Order #42", callback_url: "https://yoursite.com/kharcha/webhook" }),
});
const { session_id, qr_payload } = await res.json();`}</Code>
                        <Code lang="python">{`import requests
resp = requests.post("${BASE_URL}/api/org/qr-codes/payments/create",
    headers={"X-API-Key": "kh_live_xxxxxxxxxxxxxxxxxxxx", "Content-Type": "application/json"},
    json={"amount": 1500, "note": "Order #42", "callback_url": "https://yoursite.com/kharcha/webhook"})
data = resp.json()
session_id, qr_payload = data["session_id"], data["qr_payload"]`}</Code>
                    </Tabs>
                    <h4 className="docs__h4">Response</h4>
                    <Code lang="json">{`{ "success": true, "session_id": "f3a1b2c4-...", "qr_payload": "{\\"kharcha_qr_id\\":\\"f3a1b2c4-...\\"}" }`}</Code>

                    <h3 className="docs__h3">Rendering the QR code</h3>
                    <Tabs tabs={["React", "Vanilla JS"]}>
                        <Code lang="jsx">{`import QRCode from "qrcode";
import { useEffect, useRef } from "react";

function KharchaQR({ qrPayload }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) QRCode.toCanvas(ref.current, qrPayload, { width: 240, margin: 2 });
  }, [qrPayload]);
  return <canvas ref={ref} />;
}`}</Code>
                        <Code lang="javascript">{`import QRCode from "qrcode";
QRCode.toCanvas(document.getElementById("qr-canvas"), qrPayload, { width: 240, margin: 2 });`}</Code>
                    </Tabs>

                    <h3 className="docs__h3"><Badge method="GET" />{" "}<code>/api/org/qr-codes/payments/status/:session_id</code></h3>
                    <Code lang="javascript">{`async function pollUntilPaid(sessionId, onPaid) {
  const interval = setInterval(async () => {
    const res = await fetch(\`${BASE_URL}/api/org/qr-codes/payments/status/\${sessionId}\`,
      { headers: { "X-API-Key": "kh_live_xxxxxxxxxxxxxxxxxxxx" } });
    const { status } = await res.json();
    if (status === "success") { clearInterval(interval); onPaid(); }
    else if (status === "expired") { clearInterval(interval); /* show refresh button */ }
  }, 2500);
  return () => clearInterval(interval);
}`}</Code>
                    <div className="docs__status-list">
                        {[
                            ["pending", "Session is open, waiting for payment."],
                            ["success", "Payment received. Mark the order as paid."],
                            ["expired", "Session timed out (5 minutes). Create a new session."],
                        ].map(([s, d]) => (
                            <div className="docs__status-row" key={s}>
                                <code className={`docs__status-badge docs__status-badge--${s}`}>{s}</code>
                                <span>{d}</span>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* ══ FLOW 3 — HOSTED PAGE (old Flow 2) ═══════════ */}
                <Section id="flow-hosted">
                    <h2 className="docs__h2">
                        <span className="docs__flow-badge docs__flow-badge--3">Flow 3</span>
                        Hosted Payment Page (Legacy)
                    </h2>
                    <p className="docs__p">
                        An older redirect-based approach that uses QR session IDs as the backing store.
                        For new integrations, use <strong>Flow 1 — Payment Portal</strong> instead,
                        which uses a proper <code className="docs__inline-code">payment_sessions</code>{" "}
                        table and the email + OTP login flow.
                    </p>
                    <div className="docs__callout docs__callout--warn">
                        <strong>Use Flow 1 for new integrations.</strong> The hosted page (Flow 3)
                        reuses the QR code session table and will be deprecated in a future version.
                    </div>
                    <h3 className="docs__h3">Step 1 — Create a session</h3>
                    <Code lang="javascript">{`const res = await fetch("${BASE_URL}/api/org/qr-codes/payments/create", {
  method: "POST",
  headers: { "X-API-Key": process.env.KHARCHA_API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ amount: 1500, note: "Order #42" }),
});
const { session_id } = await res.json();`}</Code>
                    <h3 className="docs__h3">Step 2 — Redirect</h3>
                    <Code lang="javascript">{`const url = new URL("https://kharcha.app/pay/" + session_id);
url.searchParams.set("return_url", "https://yoursite.com/payment/callback");
// res.redirect(url.toString())`}</Code>
                    <h3 className="docs__h3">Step 3 — Handle the callback</h3>
                    <Code lang="javascript">{`app.get("/payment/callback", async (req, res) => {
  const { status, transaction_id, session_id } = req.query;
  if (status === "success") {
    await db.orders.markPaid({ session_id, transaction_id });
    return res.redirect("/order/confirmation");
  }
  return res.redirect("/checkout?cancelled=1");
});`}</Code>
                </Section>

                {/* ══ FLOW 4 — KHARCHA CARD (RFID) ═════════════════ */}
                <Section id="flow-card">
                    <h2 className="docs__h2">Kharcha Card (RFID POS)</h2>
                    <p className="docs__p">
                        Accept contactless payments from Kharcha physical cards at your
                        point-of-sale terminal. The customer taps their NFC/RFID card on
                        an RC522 reader; your terminal sends the card UID and amount to Kharcha,
                        which atomically debits the cardholder's wallet and credits yours.
                    </p>
                    <div className="docs__callout docs__callout--info">
                        <strong>API key required.</strong> POS terminals authenticate with an{" "}
                        <code className="docs__inline-code">X-API-Key</code> header.
                    </div>
                    <h3 className="docs__h3">Step 1 — Look up the card</h3>
                    <Code lang="http">{`GET ${BASE_URL}/api/cards/pos/lookup/:rfid_uid
X-API-Key: kh_live_xxxxxxxxxxxx`}</Code>
                    <Code lang="json">{`// 200 — active
{ "success": true, "card": { "card_id": "A3B2C1D0", "status": "active", "daily_limit": 5000 } }
// 403 — blocked
{ "success": false, "message": "Card is blocked. Payment declined." }
// 404 — not registered
{ "success": false, "message": "RFID card not found." }`}</Code>

                    <h3 className="docs__h3">Step 2 — Charge the card</h3>
                    <ParamTable params={[
                        { name: "X-API-Key", type: "header", required: true,  desc: "Your organisation API key." },
                        { name: "card_id",   type: "string", required: true,  desc: "RFID UID from the lookup response (uppercase hex)." },
                        { name: "amount",    type: "number", required: true,  desc: "Amount in NPR. Minimum NPR 1." },
                        { name: "remarks",   type: "string", required: false, desc: "Note shown in the cardholder's transaction history." },
                    ]} />
                    <Tabs tabs={["Node.js", "Python", "cURL"]}>
                        <Code lang="javascript">{`const res = await fetch("${BASE_URL}/api/pos/charge", {
  method: "POST",
  headers: { "X-API-Key": process.env.KHARCHA_API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ card_id: "A3B2C1D0", amount: 850, remarks: "Coffee & pastry" }),
});
const data = await res.json();
if (data.success) console.log("Charged!", data.transaction.transaction_id);`}</Code>
                        <Code lang="python">{`resp = requests.post("${BASE_URL}/api/pos/charge",
    headers={"X-API-Key": os.environ["KHARCHA_API_KEY"], "Content-Type": "application/json"},
    json={"card_id": "A3B2C1D0", "amount": 850, "remarks": "Coffee & pastry"})
data = resp.json()
if data["success"]: print("Charged!", data["transaction"]["transaction_id"])`}</Code>
                        <Code lang="bash">{`curl -X POST ${BASE_URL}/api/pos/charge \\
  -H "X-API-Key: kh_live_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"card_id":"A3B2C1D0","amount":850,"remarks":"Coffee & pastry"}'`}</Code>
                    </Tabs>
                    <Code lang="json">{`{
  "success": true,
  "transaction": {
    "transaction_id": "txn_abc123",
    "amount": 850,
    "currency": "NPR",
    "balance_after": 4150,
    "status": "completed"
  }
}`}</Code>
                </Section>

                {/* ══ FLOW 5 — CARD + CVV ══════════════════════════ */}
                <Section id="flow-credit">
                    <h2 className="docs__h2">Card Number + CVV</h2>
                    <p className="docs__p">
                        For online checkouts where the customer types their card details. Your
                        server collects the 16-digit card number and CVV, then calls Kharcha's
                        payment API to verify and charge in one step — pure server-to-server.
                    </p>
                    <div className="docs__callout docs__callout--info">
                        <strong>Never call from the browser.</strong> Always proxy through your own
                        server so the API key stays secret.
                    </div>

                    <h3 className="docs__h3"><Badge method="POST" />{" "}<code>/api/payment/verify</code></h3>
                    <p className="docs__p">Pre-authorization check — validates card + CVV without charging.</p>
                    <Tabs tabs={["Node.js", "cURL"]}>
                        <Code lang="javascript">{`const res = await fetch("${BASE_URL}/api/payment/verify", {
  method: "POST",
  headers: { "X-API-Key": process.env.KHARCHA_API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ card_number: "7333300000000012", cvv: "842" }),
});
const data = await res.json();
// data.valid === true → proceed to charge`}</Code>
                        <Code lang="bash">{`curl -X POST ${BASE_URL}/api/payment/verify \\
  -H "X-API-Key: kh_live_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"card_number":"7333300000000012","cvv":"842"}'`}</Code>
                    </Tabs>

                    <h3 className="docs__h3"><Badge method="POST" />{" "}<code>/api/payment/charge</code></h3>
                    <ParamTable params={[
                        { name: "X-API-Key",   type: "header", required: true,  desc: "Your organisation API key." },
                        { name: "card_number", type: "string", required: true,  desc: "16-digit Kharcha card number." },
                        { name: "cvv",         type: "string", required: true,  desc: "3-digit CVV." },
                        { name: "amount",      type: "number", required: true,  desc: "Amount in NPR. Minimum NPR 1." },
                        { name: "remarks",     type: "string", required: false, desc: "Note shown in the cardholder's history." },
                    ]} />
                    <Tabs tabs={["Node.js", "Python", "cURL"]}>
                        <Code lang="javascript">{`const res = await fetch("${BASE_URL}/api/payment/charge", {
  method: "POST",
  headers: { "X-API-Key": process.env.KHARCHA_API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ card_number: "7333300000000012", cvv: "842", amount: 1250, remarks: "Order #1042" }),
});
const data = await res.json();
if (data.success) console.log("Paid!", data.transaction.transaction_id);`}</Code>
                        <Code lang="python">{`resp = requests.post("${BASE_URL}/api/payment/charge",
    headers={"X-API-Key": os.environ["KHARCHA_API_KEY"], "Content-Type": "application/json"},
    json={"card_number": "7333300000000012", "cvv": "842", "amount": 1250, "remarks": "Order #1042"})
data = resp.json()
if data["success"]: print("Paid!", data["transaction"]["transaction_id"])`}</Code>
                        <Code lang="bash">{`curl -X POST ${BASE_URL}/api/payment/charge \\
  -H "X-API-Key: kh_live_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"card_number":"7333300000000012","cvv":"842","amount":1250,"remarks":"Order #1042"}'`}</Code>
                    </Tabs>

                    <h3 className="docs__h3">Payment error codes</h3>
                    <div className="docs__error-table-wrap">
                        <table className="docs__param-table">
                            <thead><tr><th>error_code</th><th>HTTP</th><th>Meaning</th></tr></thead>
                            <tbody>
                                {[
                                    ["INVALID_API_KEY",      "401", "Missing, revoked, or expired API key."],
                                    ["CARD_NOT_FOUND",       "404", "Card number not registered in Kharcha."],
                                    ["INVALID_CVV",          "401", "CVV does not match the card."],
                                    ["CARD_INACTIVE",        "403", "Card is blocked, expired, or pending activation."],
                                    ["DAILY_LIMIT_EXCEEDED", "400", "Charge would exceed the card's daily spend limit."],
                                    ["INSUFFICIENT_BALANCE", "400", "Cardholder wallet balance is too low."],
                                    ["SELF_CHARGE",          "400", "Your org account is the same as the cardholder."],
                                    ["VALIDATION_ERROR",     "400", "Missing or invalid request fields."],
                                    ["RATE_LIMITED",         "429", "More than 20 requests/min from this IP."],
                                    ["SERVER_ERROR",         "500", "Internal error — contact support."],
                                ].map(([code, http, desc]) => (
                                    <tr key={code}>
                                        <td><code className="docs__inline-code">{code}</code></td>
                                        <td><code className="docs__inline-code">{http}</code></td>
                                        <td>{desc}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>

                {/* ══ WEBHOOKS ══════════════════════════════════════ */}
                <Section id="webhooks">
                    <h2 className="docs__h2">Webhooks</h2>
                    <p className="docs__p">
                        Kharcha sends an HTTP <code className="docs__inline-code">POST</code> to your{" "}
                        <code className="docs__inline-code">callback_url</code> when a payment succeeds.
                        Webhooks are fire-and-forget — Kharcha does not retry on failure.
                    </p>
                    <h3 className="docs__h3">Request headers</h3>
                    <Code lang="http">{`POST https://yoursite.com/kharcha/webhook
Content-Type: application/json
X-Kharcha-Event: payment.success`}</Code>
                    <h3 className="docs__h3">Payload</h3>
                    <Code lang="json">{`{
  "event": "payment.success",
  "session_id": "a1b2c3d4-...",
  "transaction_id": "txn_abc123def456",
  "amount": 1500,
  "currency": "NPR",
  "timestamp": "2026-04-28T10:23:45.000Z"
}`}</Code>
                    <h3 className="docs__h3">Handling the webhook</h3>
                    <Code lang="javascript">{`app.post("/kharcha/webhook", express.json(), async (req, res) => {
  // Acknowledge immediately — Kharcha times out after 8 seconds
  res.status(200).send("OK");

  const { event, session_id, transaction_id, amount } = req.body;
  if (event === "payment.success") {
    await db.orders.markPaid({ session_id, transaction_id });
  }
});`}</Code>
                    <div className="docs__callout docs__callout--warn">
                        Respond with <code className="docs__inline-code">2xx</code> immediately
                        before any slow work. Kharcha has an 8-second timeout and does not retry.
                    </div>
                </Section>

                {/* ══ POLLING ═══════════════════════════════════════ */}
                <Section id="polling">
                    <h2 className="docs__h2">Polling Status</h2>
                    <p className="docs__p">
                        If you can't receive webhooks, poll the status endpoint instead.
                        This works for both the portal sessions and QR sessions.
                    </p>
                    <h3 className="docs__h3"><Badge method="GET" />{" "}<code>/api/org/qr-codes/payments/status/:session_id</code></h3>
                    <Code lang="javascript">{`async function pollStatus(sessionId) {
  const res = await fetch(
    \`${BASE_URL}/api/org/qr-codes/payments/status/\${sessionId}\`,
    { headers: { "X-API-Key": "kh_live_xxxxxxxxxxxxxxxxxxxx" } }
  );
  return res.json(); // { success, status: "pending"|"success"|"expired", amount }
}`}</Code>
                    <div className="docs__callout docs__callout--info">
                        Poll at most every 2 seconds. Portal sessions expire after 30 minutes;
                        QR sessions expire after 5 minutes.
                    </div>
                </Section>

                {/* ══ ERRORS ════════════════════════════════════════ */}
                <Section id="errors">
                    <h2 className="docs__h2">Error Reference</h2>
                    <p className="docs__p">All error responses share this shape:</p>
                    <Code lang="json">{`{ "success": false, "message": "Human-readable error" }`}</Code>
                    <div className="docs__error-table-wrap">
                        <table className="docs__param-table">
                            <thead><tr><th>HTTP Code</th><th>Meaning</th></tr></thead>
                            <tbody>
                                {[
                                    ["400", "Invalid request body (missing fields, bad values, etc.)"],
                                    ["401", "Missing or invalid API key / OTP / payment token"],
                                    ["403", "Authenticated but not authorised (wrong org, blocked card)"],
                                    ["404", "Session or card not found"],
                                    ["410", "Session expired or already completed"],
                                    ["429", "Rate limit exceeded — slow down"],
                                    ["500", "Internal server error — contact support"],
                                ].map(([code, desc]) => (
                                    <tr key={code}>
                                        <td><code className="docs__inline-code">{code}</code></td>
                                        <td>{desc}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>

            </main>
        </div>
    );
}
