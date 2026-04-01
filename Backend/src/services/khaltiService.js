const axios = require("axios");
const supabase = require("./supabaseClient");

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
