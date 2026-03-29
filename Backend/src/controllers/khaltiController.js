const { initiatePayment, verifyPayment } = require("../services/khaltiService");
const initiateKhaltiPayment = async (req, res, next) => {
  try {
    // Step 1: Get data from request body
    const { amount, userId } = req.body;

    // Step 2: Basic validation
    if (!amount || !userId) {
      return res.status(400).json({
        success: false,
        message: "Amount and userId are required",
      });
    }

    // Step 3: Call the service
    const payment_url = await initiatePayment(amount, userId);

    // Step 4: Send payment_url back to frontend
    res.status(200).json({
      success: true,
      payment_url,
    });
  } catch (error) {
    next(error); // passes error to errorHandler middleware
  }
};

const verifyKhaltiPayment = async (req, res, next) => {
  try {
    // Step 1: Get pidx from query params (sent by Khalti redirect)
    const { pidx } = req.query;

    // Step 2: Validate
    if (!pidx) {
      return res.status(400).json({
        success: false,
        message: "pidx is required",
      });
    }

    // Step 3: Call the service
    const result = await verifyPayment(pidx);

    // Step 4: Send response back
    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
module.exports = { initiateKhaltiPayment, verifyKhaltiPayment };