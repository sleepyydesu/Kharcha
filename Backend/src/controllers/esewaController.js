const { initiatePayment, verifyPayment } = require("../services/esewaService");
const supabase = require("../services/supabaseClient");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const initiateEsewaPayment = async (req, res, next) => {
  try {
    const { account_id } = req.account;
    const { amount } = req.body;

    if (!amount) {
      return res
        .status(400)
        .json({ success: false, message: "amount is required." });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 10) {
      return res
        .status(400)
        .json({ success: false, message: "Minimum load amount is NPR 10." });
    }
    if (parsedAmount > 100000) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Maximum load amount is NPR 1,00,000.",
        });
    }

    const formParams = initiatePayment(parsedAmount, account_id);

    // ── Save pending record so verifyPayment can look up account_id ──
    const { error: dbError } = await supabase.from("esewa_payments").insert({
      account_id,
      transaction_uuid: formParams.transaction_uuid,
      amount: parsedAmount,
      status: "pending",
    });

    if (dbError) throw new Error(`DB error saving payment: ${dbError.message}`);

    return res.status(200).json({
      success: true,
      message: "Payment initiated. Submit the form params to eSewa gateway.",
      gateway_url: process.env.ESEWA_GATEWAY_URL,
      formParams,
    });
  } catch (error) {
    console.error("[initiateEsewaPayment]", error.message);
    next(error);
  }
};

const verifyEsewaPayment = async (req, res, next) => {
  const { data } = req.query;
  const frontendLoad = `${FRONTEND_URL}/load`;

  if (!data) {
    return res.redirect(`${frontendLoad}?esewa=failed&message=Missing+data`);
  }

  try {
    const result = await verifyPayment(data);

    return res.redirect(
      `${frontendLoad}?esewa=success` +
        `&txn=${encodeURIComponent(result.transaction_uuid)}` +
        `&amount=${encodeURIComponent(result.amount)}`,
    );
  } catch (error) {
    console.error("[verifyEsewaPayment]", error.message);
    const msg = encodeURIComponent(error.message || "Verification failed");
    return res.redirect(`${frontendLoad}?esewa=failed&message=${msg}`);
  }
};

module.exports = { initiateEsewaPayment, verifyEsewaPayment };
