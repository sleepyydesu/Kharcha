const { initiatePayment, verifyPayment } = require("../services/khaltiService");

// Frontend base URL — where we redirect the user's browser after Khalti callback
// Set FRONTEND_URL in .env  e.g.  FRONTEND_URL=http://localhost:5173
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// ─────────────────────────────────────────────────────────────
//  INITIATE KHALTI PAYMENT
//  POST /api/khalti/initiate
//  Requires JWT auth (Bearer token in Authorization header)
//
//  Body: { amount }  — amount in NPR (min 10, max 100000)
//
//  Returns: { success, pidx, payment_url }
//  The frontend should redirect the user to payment_url.
// ─────────────────────────────────────────────────────────────
const initiateKhaltiPayment = async (req, res, next) => {
    try {
        const { account_id } = req.account; // from JWT middleware — never from body
        const { amount } = req.body;

        if (!amount) {
            return res.status(400).json({ success: false, message: "amount is required." });
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount < 10) {
            return res.status(400).json({ success: false, message: "Minimum load amount is NPR 10." });
        }
        if (parsedAmount > 100000) {
            return res.status(400).json({ success: false, message: "Maximum load amount is NPR 1,00,000." });
        }

        const { pidx, payment_url } = await initiatePayment(parsedAmount, account_id);

        return res.status(200).json({
            success: true,
            message: "Payment initiated. Redirect the user to payment_url.",
            pidx,
            payment_url,
        });
    } catch (error) {
        console.error("[initiateKhaltiPayment]", error?.response?.data || error.message);
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────
//  VERIFY KHALTI PAYMENT  (Khalti browser redirect / callback)
//  GET /api/khalti/verify?pidx=<token>
//
//  Khalti redirects the user's BROWSER here after payment.
//  We verify the payment, then redirect the browser back to
//  the frontend with the result as query params — never JSON.
//
//  Frontend landing page: /load
//    Success: /load?khalti=success&amount=500&pidx=xxx
//    Already:  /load?khalti=already
//    Failure:  /load?khalti=failed&message=...
// ─────────────────────────────────────────────────────────────
const verifyKhaltiPayment = async (req, res, next) => {
    const { pidx } = req.query;
    const frontendLoad = `${FRONTEND_URL}/load`;

    if (!pidx) {
        return res.redirect(`${frontendLoad}?khalti=failed&message=Missing+pidx`);
    }

    try {
        const result = await verifyPayment(pidx);

        if (result.already_processed) {
            return res.redirect(`${frontendLoad}?khalti=already&pidx=${encodeURIComponent(pidx)}`);
        }

        return res.redirect(
            `${frontendLoad}?khalti=success` +
            `&pidx=${encodeURIComponent(pidx)}` +
            `&amount=${encodeURIComponent(result.amount)}` +
            `&balance=${encodeURIComponent(result.balance_after)}`
        );
    } catch (error) {
        console.error("[verifyKhaltiPayment]", error?.response?.data || error.message);
        const msg = encodeURIComponent(error.message || "Verification failed");
        return res.redirect(`${frontendLoad}?khalti=failed&pidx=${encodeURIComponent(pidx)}&message=${msg}`);
    }
};

module.exports = { initiateKhaltiPayment, verifyKhaltiPayment };