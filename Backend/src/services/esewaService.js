const crypto = require("crypto");
const axios = require("axios");
const supabase = require("./supabaseClient");

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
    // ── 1. Decode base64 → JSON ───────────────────────────────
    const decoded = JSON.parse(
        Buffer.from(encodedData, "base64").toString("utf-8"),
    );
    console.log("[verifyPayment] decoded:", decoded); // 👈

    // ── 2. Verify signature ───────────────────────────────────
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

    // ── 3. Confirm with eSewa status API ─────────────────────
    const statusRes = await axios.get(process.env.ESEWA_STATUS_URL, {
        params: {
            product_code: process.env.ESEWA_PRODUCT_CODE,
            total_amount: decoded.total_amount,
            transaction_uuid: decoded.transaction_uuid,
        },
    });
    console.log("[verifyPayment] eSewa status API response:", statusRes.data); // 👈

    if (statusRes.data.status !== "COMPLETE") {
        throw new Error("eSewa status API says payment is not complete.");
    }

    const { transaction_uuid, total_amount, transaction_code } = decoded;

    // ── 4. Look up the pending record to get account_id ──────
    const { data: payment, error: lookupError } = await supabase
        .from("esewa_payments")
        .select("account_id, amount, status")
        .eq("transaction_uuid", transaction_uuid)
        .maybeSingle();

    if (lookupError) throw new Error(lookupError.message);
    if (!payment)
        throw new Error("Payment record not found for this transaction.");

    // Already processed — idempotency guard
    if (payment.status === "success") {
        return { already_processed: true, transaction_uuid };
    }

    // ── 5. Mark failed if somehow amount mismatches ───────────
    const amountNPR = payment.amount;

    // ── 6. Credit wallet atomically via RPC ──────────────────
    const { data: result, error: rpcError } = await supabase.rpc(
        "esewa_credit_wallet", // 👈 you'll need this RPC (see note below)
        {
            p_account_id: payment.account_id,
            p_transaction_uuid: transaction_uuid,
            p_amount: amountNPR,
        },
    );

    if (rpcError) {
        const msg = rpcError.message || "";
        if (msg.includes("ALREADY_PROCESSED")) {
            return { already_processed: true, transaction_uuid };
        }
        if (msg.includes("WALLET_NOT_FOUND")) {
            throw new Error("Wallet not found for this account.");
        }
        throw new Error(rpcError.message);
    }

    return {
        already_processed: false,
        transaction_uuid,
        transaction_code,
        amount: amountNPR,
        balance_after: parseFloat(result.balance_after),
    };
};

module.exports = { initiatePayment, verifyPayment };
