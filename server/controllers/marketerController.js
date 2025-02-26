const Marketer = require("../model/Marketer");
const Student = require("../model/Student");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const nodemailer = require('nodemailer');
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();


// Setup nodemailer transporter
const transporter = nodemailer.createTransport({
    host: process.env.HOST,
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
    },
});


// gets all users
const getAllMarketers = async (req, res, next) => {
    let marketers;
    try {
        marketers = await Marketer.find().select("-password");
    } catch (err) {
        return res.status(500).json({ message: "ERROR!!! Can not process it." });
    }
    if (!marketers) {
        return res.status(404).json({ message: "No marketer found!" });
    }
    return res.status(200).json({ marketers });
};


// check user profile
const getMarketer = async (req, res, next) => {
    const id = req.params.id;
    let marketer;
    try {
        marketer = await Marketer.findById(id).select("-password");
    } catch (err) {
        return res.status(500).json({ message: "ERROR!!! Can not process it." });
    }
    if (!marketer) {
        return res.status(404).json({ message: "The marketer can not be found!" });
    }
    return res.status(200).json({ marketer });
};


// update user details
const editMarketerDetails = async (req, res, next) => {
    const id = req.params.id;

    try {
        const { firstName, lastName, phoneNumber, location, userType } = req.body;

        //fetch user from database
        const marketer = await Marketer.findById(id);
        if (!marketer) {
            return res.status(403).json({ message: "Specified marketer not found." });
        }


        //Update database information
        const newMarketerInfo = await Marketer.findByIdAndUpdate(
            req.params.id,
            { firstName, lastName, phoneNumber, location, userType },
            { new: true }
        );
        res.status(200).json(newMarketerInfo);
    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: "ERROR!!! Can not process it." });
    }
};


//change password
const changePassword = async (req, res) => {

    const { id } = req.params;
    const userId = req.user.id;


    try {

        if (id !== userId) {
            return res.status(403).json({ message: "Unauthorized: You can only change your own password." });
        }

        const { oldPassword, newPassword, confirmPassword } = req.body;

        if (!oldPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: "Fill in all details" });
        }

        if (newPassword.trim().length < 8) {
            return res.status(400).json({ message: "Password is too short. It must be at least 8 characters long." });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match." });
        }

        // Fetch user from the database
        const marketer = await Marketer.findById(id);
        if (!marketer) {
            return res.status(404).json({ message: "Marketer not found." });
        }

        // Verify old password
        const isMatch = await bcrypt.compare(oldPassword, marketer.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Old password is incorrect." });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password in the database
        marketer.password = hashedPassword;
        await marketer.save();

        return res.status(200).json({ message: "Password changed successfully." });

    } catch (error) {
        return res.status(500).json({ message: "An error occurred while processing the data.", error: error.message });
    }
};


const getReferredStudentsWithDetails = async (req, res) => {

    try {
        const marketerId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(marketerId)) {
            return res.status(400).json({ message: "Invalid marketer ID format." });
        }

        // Find marketer and populate referred students, including their payments and courses
        const marketer = await Marketer.findById(marketerId).populate({
            path: "referredStudents",
            select: "firstName lastName email phoneNumber location balance userType createdAt payments",
            populate: {
                path: "payments.courseId",
                model: "Course",
                select: "title price"
            }
        })
        .lean();

        if (!marketer) {
            return res.status(404).json({ message: "Marketer not found." });
        }

        return res.status(200).json({ 
            marketerinfo: marketer,
            referredStudents: marketer.referredStudents.length > 0 
                ? marketer.referredStudents 
                : "No referred students found." 
        });
        
    } catch (err) {
        console.error("Error fetching referred students:", err);
        return res.status(500).json({ message: "Server error. Unable to fetch referred students." });
    }
};


module.exports = {
    getAllMarketers,
    getMarketer,
    editMarketerDetails,
    changePassword,
    getReferredStudentsWithDetails
};

