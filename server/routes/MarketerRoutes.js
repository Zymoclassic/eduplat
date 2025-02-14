const express = require("express");
const marketerRouter = express.Router();

// import functions from marketerController
const {  getAllMarketers, getMarketer, editMarketerDetails, getReferredStudentsWithDetails } = require("../controllers/marketerController");

// define the routes
marketerRouter.get('/', getAllMarketers);
marketerRouter.get('/:id', getMarketer);
marketerRouter.patch('/:id/edit-details', editMarketerDetails);
marketerRouter.get('/:id/dashboard', getReferredStudentsWithDetails);

module.exports = marketerRouter;

