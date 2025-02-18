const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require('dotenv');
const AuthRouter = require("./routes/AuthRoutes");
const StudentRouter = require("./routes/StudentRoutes");
const MarketerRouter = require("./routes/MarketerRoutes");
const CourseRouter = require("./routes/CourseRoutes");
const PaymentRouter = require("./routes/PaymentRoutes");
const WalletRouter = require("./routes/WalletRoutes");
const { notFound, errorHandler } = require("./utils/errorMiddleware");
const { authMiddleware } = require("./utils/authMiddleware");
dotenv.config();

const app = express();


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
app.use(notFound);
app.use(errorHandler);




mongoose.connect(process.env.MONGO_URI)
.then(() => app.listen(process.env.PORT))
.then(() => console.log(`Connection successful, please check port ${process.env.PORT}!`))
.catch((err) => console.log(err));


module.exports = app;

