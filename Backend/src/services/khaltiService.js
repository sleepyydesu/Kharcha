const axios = require("axios");
const supabase = require("./supabaseClient");

<<<<<<< HEAD
const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY;

const KHALTI_INITIATE_URL = "https://dev.khalti.com/api/v2/epayment/initiate/";
const KHALTI_VERIFY_URL = "https://dev.khalti.com/api/v2/epayment/lookup/";

const initiatePayment = async (amount, userId) => {
  // Step 1: Send request to Khalti
  const response = await axios.post(
    KHALTI_INITIATE_URL,
    {
      amount: amount * 100, // Khalti uses paisa, so Rs.10 = 1000 paisa
      purchase_order_id: `order_${userId}_${Date.now()}`,
      purchase_order_name: "Wallet Top Up",
      return_url: "http://localhost:5000/api/khalti/verify",
      website_url: "http://localhost:5000",
    },
    {
      headers: {
        Authorization: `Key ${KHALTI_SECRET_KEY}`,
      },
    },
  );

  const { pidx, payment_url } = response.data;

  // Step 2: Save to Supabase
  const { error } = await supabase.from("khalti_payments").insert({
    user_id: userId,
    pidx: pidx,
    amount: amount,
    status: "pending",
  });

  if (error) throw new Error(error.message);

  // Step 3: Return payment_url to controller
  return payment_url;
};

const verifyPayment = async (pidx) => {
  const response = await axios.post(
    KHALTI_VERIFY_URL,
    { pidx },
    {
      headers: {
        Authorization: `Key ${KHALTI_SECRET_KEY}`,
      },
    },
  );
  const { status } = response.data;

  if (status !== "Completed") {
    throw new Error("Payment not completed");
  }

  const { error } = await supabase
    .from("khalti_payments")
    .update({ status: "success" })
    .eq("pidx", pidx);

  if (error) throw new Error(error.message);

  return { success: true, pidx };
};
module.exports = { initiatePayment, verifyPayment };
=======
const KHALTI_SECRET_KEY   = process.env.KHALTI_SECRET_KEY;
const KHALTI_RETURN_URL   = process.env.KHALTI_RETURN_URL || "http://localhost:5000/api/khalti/verify";
const KHALTI_WEBSITE_URL  = process.env.KHALTI_WEBSITE_URL || "http://localhost:5000";

const KHALTI_INITIATE_URL = "https://dev.khalti.com/api/v2/epayment/initiate/";
const KHALTI_VERIFY_URL   = "https://dev.khalti.com/api/v2/epayment/lookup/";

// ─────────────────────────────────────────────────────────────
//  initiatePayment
//  Calls Khalti to create a payment session, saves a pending
//  record in khalti_payments, returns the Khalti payment URL.
// ─────────────────────────────────────────────────────────────
const initiatePayment = async (amount, accountId) => {
    const purchase_order_id = `kharcha_${accountId}_${Date.now()}`;

    // Call Khalti initiate API
    const response = await axios.post(
        KHALTI_INITIATE_URL,
        {
            amount: Math.round(amount * 100), // NPR → paisa (Khalti expects integer)
            purchase_order_id,
            purchase_order_name: "Kharcha Wallet Top-up",
            return_url: KHALTI_RETURN_URL,
            website_url: KHALTI_WEBSITE_URL,
        },
        {
            headers: {
                Authorization: `Key ${KHALTI_SECRET_KEY}`,
                "Content-Type": "application/json",
            },
        },
    );

    const { pidx, payment_url } = response.data;

    // Save pending record — we need this to look up the account_id
    // later when Khalti redirects back with only the pidx
    const { error } = await supabase.from("khalti_payments").insert({
        account_id: accountId,
        pidx,
        amount,
        status: "pending",
    });

    if (error) throw new Error(`DB error saving payment: ${error.message}`);

    return { pidx, payment_url };
};

// ─────────────────────────────────────────────────────────────
//  verifyPayment
//  Called when Khalti redirects the user back to our return_url.
//  1. Asks Khalti to confirm the payment is real and completed.
//  2. Looks up the khalti_payments row to get the account_id.
//  3. Calls the khalti_credit_wallet RPC (atomic + idempotent).
// ─────────────────────────────────────────────────────────────
const verifyPayment = async (pidx) => {
    // ── 1. Ask Khalti to confirm ──────────────────────────────
    const response = await axios.post(
        KHALTI_VERIFY_URL,
        { pidx },
        {
            headers: {
                Authorization: `Key ${KHALTI_SECRET_KEY}`,
                "Content-Type": "application/json",
            },
        },
    );

    const { status, total_amount } = response.data;

    if (status !== "Completed") {
        // Mark as failed so we know not to retry
        await supabase
            .from("khalti_payments")
            .update({ status: "failed" })
            .eq("pidx", pidx);

        throw new Error(`Payment not completed. Khalti status: ${status}`);
    }

    // ── 2. Look up the pending record to get account_id ───────
    const { data: payment, error: lookupError } = await supabase
        .from("khalti_payments")
        .select("account_id, amount, status")
        .eq("pidx", pidx)
        .maybeSingle();

    if (lookupError) throw new Error(lookupError.message);
    if (!payment) throw new Error("Payment record not found for this pidx.");

    // Already processed — return gracefully (idempotency)
    if (payment.status === "success") {
        return { already_processed: true, pidx };
    }

    // Use the amount from our DB, not Khalti's (Khalti sends paisa, ours is NPR)
    const amountNPR = payment.amount;

    // ── 3. Credit wallet atomically via RPC ───────────────────
    const { data: result, error: rpcError } = await supabase.rpc(
        "khalti_credit_wallet",
        {
            p_account_id: payment.account_id,
            p_pidx:       pidx,
            p_amount:     amountNPR,
        },
    );

    if (rpcError) {
        const msg = rpcError.message || "";
        if (msg.includes("ALREADY_PROCESSED")) {
            return { already_processed: true, pidx };
        }
        if (msg.includes("WALLET_NOT_FOUND")) {
            throw new Error("Wallet not found for this account.");
        }
        throw new Error(rpcError.message);
    }

    return {
        already_processed: false,
        pidx,
        transaction_id:  result.transaction_id,
        amount:          amountNPR,
        balance_after:   parseFloat(result.balance_after),
    };
};

module.exports = { initiatePayment, verifyPayment };
>>>>>>> f531e3a8ff24f510dd1cf8ebbaa5b83a13e7a1b8
