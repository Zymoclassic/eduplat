const express = require("express");
const notificationRouter = express.Router();

// import functions notificationController
const {  sendNotification, getUserNotifications, markAsRead } = require("../controllers/notificationController");

// define the routes
notificationRouter.post('/', sendNotification);
notificationRouter.get('/:userModel/:userId', getUserNotifications);
notificationRouter.put('/:userModel/:userId/:id', markAsRead);


module.exports = notificationRouter;

