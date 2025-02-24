const express = require("express");
const notificationRouter = express.Router();

// import functions notificationController
const {  sendNotification, getUserNotifications, markAsRead } = require("../controllers/notificationController");

// define the routes
notificationRouter.post('/notify', sendNotification);
notificationRouter.get('/check', getUserNotifications);
notificationRouter.put('/read', markAsRead);


module.exports = notificationRouter;

