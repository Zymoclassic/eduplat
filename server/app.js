const http = require("http");
const socketIo = require("socket.io");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const { notFound, errorHandler } = require("./utils/errorMiddleware");
const { authMiddleware } = require("./utils/authMiddleware");
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");


// Import Routes
const AuthRouter = require("./routes/AuthRoutes");
const StudentRouter = require("./routes/StudentRoutes");
const MarketerRouter = require("./routes/MarketerRoutes");
const CourseRouter = require("./routes/CourseRoutes");
const PaymentRouter = require("./routes/PaymentRoutes");
const WalletRouter = require("./routes/WalletRoutes");
const WithdrawalRouter = require("./routes/WithdrawalRoutes");
const NotificationRouter = require("./routes/NotificationRoutes");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ credentials: true, origin: "*" }));

// Routes
app.get("/", (req, res) => {
  res.send("Hello world");
});
app.use("/auth", AuthRouter);
app.use("/student", StudentRouter);
app.use("/marketer", MarketerRouter);
app.use("/course", CourseRouter);
app.use("/pay", PaymentRouter);
app.use("/wallet", WalletRouter);
app.use("/withdraw", WithdrawalRouter);
app.use("/notification", NotificationRouter);

// Error Handlers
app.use(notFound);
app.use(errorHandler);

// Handle Socket.IO Connections
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", ({ userId, userModel }) => {
    const room = `${userModel}-${userId}`;
    socket.join(room);
    console.log(`User ${userId} joined room: ${room}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Function to Send Real-Time Notifications via Socket.IO
const sendRealTimeNotification = (userId, userModel, notification) => {
  const room = `${userModel}-${userId}`;
  io.to(room).emit("newNotification", notification);
};

// Connect to MongoDB and Start Server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    server.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => console.error("MongoDB connection error:", err));

module.exports = {
  app,
  sendRealTimeNotification,
};
