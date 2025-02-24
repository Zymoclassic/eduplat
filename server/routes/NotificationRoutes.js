const express = require("express");
const notificationRouter = express.Router();

// import functions notificationController
const {  sendNotification, getUserNotifications, markAsRead } = require("../controllers/notificationController");

// define the routes
notificationRouter.post('/', sendNotification);
notificationRouter.get('/:userId', getUserNotifications);
notificationRouter.put('/:userId/read', markAsRead);


module.exports = notificationRouter;

