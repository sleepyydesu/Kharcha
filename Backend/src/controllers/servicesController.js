const { getServices, payService } = require("../services/servicesService");

// ─────────────────────────────────────────────
//  GET ALL SERVICES
//  GET /api/services/list
//  Returns all available services for frontend
// ─────────────────────────────────────────────
const listServices = (req, res) => {
  const services = getServices();
  return res.status(200).json({
    success: true,
    services,
  });
};

// ─────────────────────────────────────────────
//  PAY A SERVICE
//  POST /api/services/topup
//  POST /api/services/utility
//
//  Body:
//    service_key   string  — "ntc" | "ncell" | "nea" | "khanepani"
//    amount        number  — amount in NPR
//    identifier    string  — phone number (topup) or customer ID (utility)
//    mpin          string  — user's MPIN to authorize payment
// ─────────────────────────────────────────────
const makeServicePayment = async (req, res, next) => {
  try {
    const { account_id } = req.account;
    const { service_key, amount, identifier, mpin } = req.body;

    // Validate required fields
    if (!service_key || !amount || !identifier || !mpin) {
      return res.status(400).json({
        success: false,
        message: "service_key, amount, identifier and mpin are all required.",
      });
    }

    const result = await payService(
      account_id,
      service_key,
      amount,
      identifier,
      mpin
    );

    return res.status(200).json({
      success: true,
      message: `${result.service} payment successful.`,
      data: result,
    });
  } catch (err) {
    // Handle errors thrown from service with a status code
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
};

module.exports = { listServices, makeServicePayment };