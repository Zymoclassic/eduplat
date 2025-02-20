const express = require("express");
const paymentRouter = express.Router();

// import functions from paymentController
const { initializePayment, completePayment, verifyPayment, handleWebhook } = require("../controllers/paymentController");
const { authMiddleware } = require("../utils/authMiddleware");

// define routes
paymentRouter.post('/initiate-payment', authMiddleware, initializePayment);
paymentRouter.post('/complete-payment', authMiddleware, completePayment);
paymentRouter.get('/verify-payment', verifyPayment);
paymentRouter.post('/webhook', handleWebhook);

module.exports = paymentRouter;

