const express = require("express");
const marketerRouter = express.Router();

// import functions from marketerController
const {  getAllMarketers, getMarketer, editMarketerDetails, changePassword, getReferredStudentsWithDetails } = require("../controllers/marketerController");
const { authMiddleware } = require("../utils/authMiddleware");

// define the routes
marketerRouter.get('/', getAllMarketers);
marketerRouter.get('/:id', getMarketer);
marketerRouter.patch('/:id/edit-details',authMiddleware, editMarketerDetails);
marketerRouter.patch('/:id/change-password', authMiddleware, changePassword);
marketerRouter.get('/:id/dashboard', authMiddleware, getReferredStudentsWithDetails);

module.exports = marketerRouter;

