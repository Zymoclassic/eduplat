const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const cookieParser = require("cookie-parser");
const dotenv = require('dotenv');
const AuthRouter = require("./routes/AuthRoutes");
const StudentRouter = require("./routes/StudentRoutes");
const MarketerRouter = require("./routes/MarketerRoutes");
const CourseRouter = require("./routes/CourseRoutes");
const PaymentRouter = require("./routes/PaymentRoutes");
const WalletRouter = require("./routes/WalletRoutes");
const WithdrawalRouter = require("./routes/WithdrawalRoutes");
const NotificationRouter = require("./routes/NotificationRoutes");
const { notFound, errorHandler } = require("./utils/errorMiddleware");
const { authMiddleware } = require("./utils/authMiddleware");
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });


// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({extended: true}));
app.use(cors({credentials: true, origin: "*"}));


// Routes
app.get('/', (req, res) => {
    res.send('Hello world');
  });
app.use("/auth", AuthRouter);
app.use("/student", StudentRouter);
app.use("/marketer", MarketerRouter);
app.use("/course", CourseRouter);
app.use("/pay", PaymentRouter);
app.use("/wallet", WalletRouter);
app.use("/withdraw", WithdrawalRouter);
app.use("/notification", NotificationRouter);
app.use(notFound);
app.use(errorHandler);


// Handle socket connections
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(userId); // User joins their private notification room
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Function to send real-time notifications
const sendRealTimeNotification = (userId, notification) => {
  io.to(userId).emit("newNotification", notification);
};


mongoose.connect(process.env.MONGO_URI)
.then(() => app.listen(process.env.PORT))
.then(() => console.log(`Connection successful, please check port ${process.env.PORT}!`))
.catch((err) => console.log(err));


module.exports = { 
  app,
  sendRealTimeNotification 
};

