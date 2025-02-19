const Marketer = require("../model/Marketer");
const Student = require("../model/Student");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
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


const getReferredStudentsWithDetails = async (req, res) => {

    try {
        const marketerId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(marketerId)) {
            return res.status(400).json({ message: "Invalid marketer ID format." });
        }

        // Find marketer and populate referred students
        const marketer = await Marketer.findById(marketerId).populate({
            path: "referredStudents",
            select: "firstName lastName email phoneNumber location balance course userType createdAt",
            populate: {
                path: "course",
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
    getReferredStudentsWithDetails
};

