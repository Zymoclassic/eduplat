const express = require("express");
const marketerRouter = express.Router();

// import functions from marketerController
const {  getAllMarketers, getMarketer, editMarketerDetails, getReferredStudentsWithDetails } = require("../controllers/marketerController");
const { authMiddleware } = require("../utils/authMiddleware");

// define the routes
marketerRouter.get('/', getAllMarketers);
marketerRouter.get('/:id', getMarketer);
marketerRouter.patch('/:id/edit-details',authMiddleware, editMarketerDetails);
marketerRouter.get('/:id/dashboard', authMiddleware, getReferredStudentsWithDetails);

module.exports = marketerRouter;

