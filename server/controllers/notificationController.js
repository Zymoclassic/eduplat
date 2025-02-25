const Notification = require("../model/Notification");
const { isValidObjectId, isValidUserModel, sendRealTimeNotification } = require("../utils/notificationMiddleware");

// Send a new notification
const sendNotification = async (req, res) => {
  try {
    const { userId, userModel, title, message, type, deviceToken } = req.body;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ success: false, error: "Invalid userId" });
    }
    if (!isValidUserModel(userModel)) {
      return res.status(400).json({ success: false, error: "Invalid user type" });
    }

    const notification = new Notification({ user: userId, userModel, title, message, type });
    await notification.save();

    sendRealTimeNotification(userId, notification);

    res.status(201).json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all notifications for a user
const getUserNotifications = async (req, res) => {
  try {
    const { userId, userModel } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ success: false, error: "Invalid userId" });
    }
    if (!isValidUserModel(userModel)) {
      return res.status(400).json({ success: false, error: "Invalid user type" });
    }

    const notifications = await Notification.find({ user: userId, userModel }).sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Mark a notification as read
const markAsRead = async (req, res) => {
  try {
    const { userId, userModel, id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: "Invalid notification ID" });
    }

    const updatedNotification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!updatedNotification) {
      return res.status(404).json({ success: false, error: "Notification not found" });
    }

    res.status(200).json({ success: true, message: "Notification marked as read", notification: updatedNotification });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { sendNotification, getUserNotifications, markAsRead };
