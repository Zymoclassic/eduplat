const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      required: true, 
      refPath: "userModel", 
      index: true  // Helps optimize queries
    },
    userModel: { type: String, required: true, enum: ["Student", "Marketer"] },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["info", "alert", "message"], required: true },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null }, // Tracks when notification was read
    extraData: {
      url: { type: String, default: "" }, // Example: link to open
      metadata: { type: Object, default: {} }, // Additional info if needed
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
