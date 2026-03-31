const { initiatePayment, verifyPayment } = require("../services/khaltiService");

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
            return res.status(400).json({
                success: false,
                message: "amount is required.",
            });
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount < 10) {
            return res.status(400).json({
                success: false,
                message: "Minimum load amount is NPR 10.",
            });
        }
        if (parsedAmount > 100000) {
            return res.status(400).json({
                success: false,
                message: "Maximum load amount is NPR 1,00,000.",
            });
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
//  VERIFY KHALTI PAYMENT  (Khalti redirect / callback)
//  GET /api/khalti/verify?pidx=<token>
//  No JWT — Khalti redirects the user here after payment.
//
//  Query: { pidx }
//
//  Returns: { success, transaction_id, amount, balance_after }
//  The frontend can use this response to show a success screen.
// ─────────────────────────────────────────────────────────────
const verifyKhaltiPayment = async (req, res, next) => {
    try {
        const { pidx } = req.query;

        if (!pidx) {
            return res.status(400).json({
                success: false,
                message: "pidx query parameter is required.",
            });
        }

        const result = await verifyPayment(pidx);

        if (result.already_processed) {
            return res.status(200).json({
                success: true,
                message: "Payment was already processed.",
                pidx,
            });
        }

        return res.status(200).json({
            success: true,
            message: `NPR ${result.amount} loaded into your Kharcha wallet.`,
            transaction_id: result.transaction_id,
            amount: result.amount,
            balance_after: result.balance_after,
            pidx,
        });
    } catch (error) {
        console.error("[verifyKhaltiPayment]", error?.response?.data || error.message);
        next(error);
    }
};

module.exports = { initiateKhaltiPayment, verifyKhaltiPayment };