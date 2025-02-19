const express = require("express");
const walletRouter = express.Router();

// import functions from authController
const { viewStudentWallet, setStudentUniquePin, checkStudentUniquePin, viewMarketerWallet, setMarketerUniquePin, checkMarketerUniquePin, requestSPinReset, requestMPinReset, verifySResetToken, verifyMResetToken, setSNewPin, setMNewPin } = require("../controllers/walletController");
const { authMiddleware } = require("../utils/authMiddleware");

// define authentication routes
walletRouter.get('/s/:id', authMiddleware, checkStudentUniquePin, viewStudentWallet);
walletRouter.get('/m/:id', authMiddleware, checkMarketerUniquePin, viewMarketerWallet);
walletRouter.post("/s/:id/set-pin", authMiddleware, setStudentUniquePin);
walletRouter.post("/m/:id/set-pin", authMiddleware, setMarketerUniquePin);
walletRouter.post("/s/:id/request-reset", authMiddleware, checkStudentUniquePin, requestSPinReset);
walletRouter.post("/m/:id/request-reset", authMiddleware, checkMarketerUniquePin, requestMPinReset);
walletRouter.post("/s/:id/verify-pin", authMiddleware, checkStudentUniquePin, verifySResetToken);
walletRouter.post("/m/:id/verify-pin", authMiddleware, checkMarketerUniquePin, verifyMResetToken);
walletRouter.post("/s/:id/reset-pin", authMiddleware, checkStudentUniquePin, setSNewPin);
walletRouter.post("/m/:id/reset-pin", authMiddleware, checkMarketerUniquePin, setMNewPin);

module.exports = walletRouter;

