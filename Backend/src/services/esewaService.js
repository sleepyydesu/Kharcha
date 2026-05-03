const crypto = require("crypto");
const axios = require("axios");

const generateSignature = (total_amount, transaction_uuid) => {
  const message = `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${process.env.ESEWA_PRODUCT_CODE}`;
  return crypto
    .createHmac("sha256", process.env.ESEWA_SECRET_KEY)
    .update(message)
    .digest("base64");
};

const initiatePayment = (amount, account_id) => {
  const transaction_uuid = `${account_id}-${Date.now()}`;
  const total_amount = parseFloat(amount).toFixed(2);
  const signature = generateSignature(total_amount, transaction_uuid);

  return {
    transaction_uuid,
    amount: total_amount,
    tax_amount: "0",
    product_service_charge: "0",
    product_delivery_charge: "0",
    total_amount,
    product_code: process.env.ESEWA_PRODUCT_CODE,
    signature,
    signed_field_names: "total_amount,transaction_uuid,product_code",
    success_url: `${process.env.BACKEND_URL}/api/esewa/verify`,
    failure_url: `${process.env.FRONTEND_URL}/load?esewa=failed`,
  };
};

const verifyPayment = async (encodedData) => {
  // Decode base64 → JSON
  const decoded = JSON.parse(
    Buffer.from(encodedData, "base64").toString("utf-8"),
  );

  // Verify signature
  const signedFields = decoded.signed_field_names.split(",");
  const message = signedFields.map((f) => `${f}=${decoded[f]}`).join(",");
  const expectedSig = crypto
    .createHmac("sha256", process.env.ESEWA_SECRET_KEY)
    .update(message)
    .digest("base64");

  if (expectedSig !== decoded.signature) {
    throw new Error("Signature mismatch. Payment verification failed.");
  }

  if (decoded.status !== "COMPLETE") {
    throw new Error(`Payment not complete. Status: ${decoded.status}`);
  }

  // Confirm with eSewa status API
  const statusRes = await axios.get(process.env.ESEWA_STATUS_URL, {
    params: {
      product_code: process.env.ESEWA_PRODUCT_CODE,
      total_amount: decoded.total_amount,
      transaction_uuid: decoded.transaction_uuid,
    },
  });

  if (statusRes.data.status !== "COMPLETE") {
    throw new Error("eSewa status API says payment is not complete.");
  }

  return {
    transaction_uuid: decoded.transaction_uuid,
    amount: decoded.total_amount,
    transaction_code: decoded.transaction_code,
  };
};

module.exports = { initiatePayment, verifyPayment };
