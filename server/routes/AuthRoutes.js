const express = require("express");
const authRouter = express.Router();

// import functions from authController
const {  signUp, verifyOtp, resendOtp, logIn, forgotPassword, resetPassword, verifyResetOtp } = require("../controllers/authController");

// define authentication routes
authRouter.post('/signup', signUp);
authRouter.post('/verify-email', verifyOtp);
authRouter.post('/resend-verification', resendOtp);
authRouter.post('/login', logIn);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/verify-otp', verifyResetOtp);
authRouter.post('/reset-password', resetPassword);


module.exports = authRouter;

