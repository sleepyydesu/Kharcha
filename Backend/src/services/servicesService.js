const supabase = require("./supabaseClient");

// ─────────────────────────────────────────────
// SERVICE REGISTRY
// Maps service keys to their org account_ids
// Add new services here as they're onboarded
// ─────────────────────────────────────────────
const SERVICES = {
  // Mobile Top Up
  ntc: {
    account_id: "ae60a54e-15f0-467b-a687-6e2347694ffb",
    name: "NTC",
    category: "Mobile Top Up",
    requires: "phone_number",
  },
  ncell: {
    account_id: "fbaf59a1-9820-4e94-99aa-a0eb835522b3",
    name: "Ncell",
    category: "Mobile Top Up",
    requires: "phone_number",
  },
  // Utilities
  nea: {
    account_id: "bd51f769-9fbf-491a-8562-3d471f0cc74b",
    name: "NEA",
    category: "Electricity Bill",
    requires: "customer_id",
  },
  khanepani: {
    account_id: "f0aa47c1-f58a-4065-852b-27383b4ac5ed",
    name: "Community Khanepani",
    category: "Water Bill",
    requires: "customer_id",
  },
};
// Returns all available services (for frontend to display)
const getServices = () => {
  return Object.entries(SERVICES).map(([key, service]) => ({
    key,
    name: service.name,
    category: service.category,
    requires: service.requires,
  }));
};
const payService = async (senderAccountId, serviceKey, amount, identifier, mpin) => {
  // Step 1: Find the service
  const service = SERVICES[serviceKey.toLowerCase()];
  if (!service) {
    throw { status: 404, message: `Service '${serviceKey}' not found.` };
  }

  // Step 2: Verify MPIN ← NEW
  if (!mpin) {
    throw { status: 400, message: "MPIN is required to authorize payment." };
  }

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("mpin_hash")
    .eq("account_id", senderAccountId)
    .single();

  if (accountError) throw { status: 500, message: accountError.message };

  if (!account.mpin_hash) {
    throw {
      status: 403,
      message: "You have not set up an MPIN yet. Please set one before making payments.",
    };
  }

  const bcrypt = require("bcrypt");
  const mpinValid = await bcrypt.compare(mpin.toString(), account.mpin_hash);
  if (!mpinValid) {
    throw { status: 401, message: "Incorrect MPIN." };
  }

  // Step 3: Validate amount
  const parsedAmount = parseFloat(amount);
  if (!parsedAmount || parsedAmount <= 0) {
    throw { status: 400, message: "Amount must be a positive number." };
  }

  // Step 4: Validate identifier
  if (!identifier) {
    throw {
      status: 400,
      message: `${service.requires === "phone_number" ? "Phone number" : "Customer ID"} is required.`,
    };
  }

  // Step 5: Call transfer_funds RPC
  const { data: result, error } = await supabase.rpc("transfer_funds", {
    p_sender_account_id: senderAccountId,
    p_receiver_account_id: service.account_id,
    p_amount: parsedAmount,
    p_category_id: null,
    p_remarks: `${service.name} payment for ${identifier}`,
  });

  if (error) {
    const msg = error.message || "";
    if (msg.includes("INSUFFICIENT_BALANCE")) {
      throw { status: 400, message: "Insufficient wallet balance." };
    }
    if (msg.includes("WALLET_NOT_FOUND")) {
      throw { status: 400, message: "Wallet not found." };
    }
    if (msg.includes("WALLET_INACTIVE")) {
      throw { status: 400, message: "Wallet is inactive." };
    }
    throw { status: 500, message: error.message };
  }

  // Step 6: Return result
  return {
    service: service.name,
    category: service.category,
    identifier,
    amount: parsedAmount,
    transaction_id: result.transaction_id,
    balance_after: parseFloat(result.sender_balance_after),
  };
};

module.exports = { getServices, payService };