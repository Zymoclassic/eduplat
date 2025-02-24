const mongoose = require("mongoose");
const Notification = require("../model/Notification");

// Function to validate MongoDB ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Function to validate userModel
const isValidUserModel = (userModel) => ["Student", "Marketer"].includes(userModel);

// Function to send real-time notification
const sendRealTimeNotification = (userId, notification) => {
  // Assuming `io` is initialized in `server.js`
  if (global.io) {
    global.io.to(userId).emit("newNotification", notification);
  }
};


module.exports = {
  isValidObjectId,
  isValidUserModel,
  sendRealTimeNotification
};
