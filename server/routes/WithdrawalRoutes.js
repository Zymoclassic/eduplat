const express = require("express");
const withdrawalRouter = express.Router();

// import functions from marketerController
const {  requestWithdrawal, verifyWithdrawal, updateWithdrawalStatus, getUserWithdrawals, getAllWithdrawals, } = require("../controllers/withdrawalController");
const { authMiddleware } = require("../utils/authMiddleware");

// define the routes
withdrawalRouter.put('/update-status', updateWithdrawalStatus);
withdrawalRouter.get('/dashboard/withdrawal-history', getAllWithdrawals);
withdrawalRouter.post('/', authMiddleware, requestWithdrawal);
withdrawalRouter.post('/verify-token', authMiddleware, verifyWithdrawal);
withdrawalRouter.get('/:id/withdrawal-history',authMiddleware, getUserWithdrawals);
// withdrawalRouter.post('/m', authMiddleware, requestMWithdrawal);
// withdrawalRouter.post('/m/verify-token', authMiddleware, verifyMWithdrawal);
// withdrawalRouter.get('/m/:id/withdrawal-history',authMiddleware, getMarketerWithdrawals);


module.exports = withdrawalRouter;

