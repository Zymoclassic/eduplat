const express = require("express");
const paymentRouter = express.Router();

// import functions from paymentController
const { initializePayment, verifyPayment, handleWebhook } = require("../controllers/paymentController");

// define routes
paymentRouter.post('/initiate-payment', initializePayment);
paymentRouter.get('/verify-payment', verifyPayment);
paymentRouter.post('/webhook', handleWebhook);

module.exports = paymentRouter;

