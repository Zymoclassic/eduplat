const express = require("express");
const paymentRouter = express.Router();

// import functions from paymentController
const { initializePayment, verifyPayment, handleWebhook } = require("../controllers/paymentController");
const { authMiddleware } = require("../utils/authMiddleware");

// define routes
paymentRouter.post('/initiate-payment', authMiddleware, initializePayment);
paymentRouter.get('/verify-payment', verifyPayment);
paymentRouter.post('/webhook', handleWebhook);

module.exports = paymentRouter;

