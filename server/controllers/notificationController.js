const Notification = require("../model/Notification");


// Send a new notification
const sendNotification = async (req, res) => {
  try {
    const { userId, title, message, type } = req.body;
    const notification = await Notification.create({ userId, title, message, type });

    sendRealTimeNotification(userId, notification);

    res.status(201).json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const getUserNotifications = async (req, res) => {
    try {
      const userId = req.params.userId;
      const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
  
      res.status(200).json({ success: true, notifications });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  

  const markAsRead = async (req, res) => {
    try {
      const { id } = req.params;
      await Notification.findByIdAndUpdate(id, { isRead: true });
  
      res.status(200).json({ success: true, message: "Notification marked as read" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  

  module.exports = {
    sendNotification,
    getUserNotifications,
    markAsRead
};
