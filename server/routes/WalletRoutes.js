const express = require("express");
const walletRouter = express.Router();

// import functions from authController
const { viewStudentWallet, setStudentUniquePin, checkStudentUniquePin, viewMarketerWallet, setMarketerUniquePin, checkMarketerUniquePin } = require("../controllers/walletController");
const { authMiddleware } = require("../utils/authMiddleware");

// define authentication routes
walletRouter.get('/s/:id', authMiddleware, checkStudentUniquePin, viewStudentWallet);
walletRouter.get('/m/:id', authMiddleware, checkMarketerUniquePin, viewMarketerWallet);
walletRouter.post("/s/:id/set-pin", authMiddleware, setStudentUniquePin);
walletRouter.post("/m/:id/set-pin", authMiddleware, setMarketerUniquePin);

module.exports = walletRouter;

