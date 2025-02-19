const Student = require("../model/Student");
const Marketer = require("../model/Marketer");
const mongoose = require("mongoose");
const nodemailer = require('nodemailer');
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();


// Middleware to check if student uniquePin is set
async function checkStudentUniquePin(req, res, next) {
    try {
        const { id } = req.params; // Get ID from URL
        if (id !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized access." });
        }

        const student = await Student.findById(req.user.id);
        if (!student) {
            return res.status(404).json({ message: "Student not found." });
        }

        if (!student.uniquePin) {
            return res.status(403).json({ message: "Access denied. Please set your unique pin first." });
        }

        next();
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server error", error });
    }
};


// Middleware to check if marketer uniquePin is set
async function checkMarketerUniquePin(req, res, next) {
    try {
        const { id } = req.params; // Get ID from URL
        if (id !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized access." });
        }
        
        const marketer = await Marketer.findById(req.user.id);
        if (!marketer) {
            return res.status(404).json({ message: "Marketer not found." });
        }

        if (!marketer.uniquePin) {
            return res.status(403).json({ message: "Access denied. Please set your unique pin first." });
        }

        next();
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};


// Route to view student wallet (requires uniquePin)
const viewStudentWallet = async (req, res) => {
    try {
        const student = await Student.findById(req.user.id);
        if (!student) {
            return res.status(404).json({ message: "Student not found." });
        }

        // Ensure uniquePin is set before allowing balance access
        if (!student.uniquePin) {
            return res.status(403).json({ message: "Access denied. Please set your unique pin first." });
        }

        res.json({ balance: student.balance });
    } catch (error) {
        res.status(500).json({ message: "Error fetching wallet", error });
    }
};


// Route to view marketer wallet (requires uniquePin)
const viewMarketerWallet = async (req, res) => {
    try {
        const marketer = await Marketer.findById(req.user.id);
        if (!marketer) {
            return res.status(404).json({ message: "Marketer not found." });
        }

        // Ensure uniquePin is set before allowing balance access
        if (!marketer.uniquePin) {
            return res.status(403).json({ message: "Access denied. Please set your unique pin first." });
        }

        res.json({ balance: marketer.balance });
    } catch (error) {
        res.status(500).json({ message: "Error fetching wallet", error });
    }
};

// Route to set the uniquePin (if it's not set)
const setStudentUniquePin = async (req, res) => {
    const { email, pin} = req.body;

    if (!pin || !email) {
        return res.status(400).json({ message: "Email, Id, and Pin are required." });
    }

    try {
        const student = await Student.findById(req.user.id);
        if (!student) {
            return res.status(404).json({ message: "Student not found." });
        }

        if (student.uniquePin) {
            return res.status(400).json({ message: "Pin is already set." });
        }

        student.uniquePin = pin;
        await student.save();

        res.status(200).json({ message: "Unique pin set successfully." });
    } catch (error) {
        res.status(500).json({ message: "Error setting pin", error });
    }
};


// Route to set the uniquePin (if it's not set)
const setMarketerUniquePin = async (req, res) => {
    const { email, pin } = req.body;

    if (!pin || !email) {
        return res.status(400).json({ message: "Email, Id, and Pin are required." });
    }

    try {
        const marketer = await Marketer.findById(req.user.id);
        if (!marketer) {
            return res.status(404).json({ message: "Marketer not found." });
        }

        if (marketer.uniquePin) {
            return res.status(400).json({ message: "Pin is already set." });
        }

        marketer.uniquePin = pin;
        await marketer.save();

        res.status(200).json({ message: "Unique pin set successfully." });
    } catch (error) {
        res.status(500).json({ message: "Error setting pin", error });
    }
};

module.exports = {
    viewStudentWallet,
    setStudentUniquePin,
    checkStudentUniquePin,
    viewMarketerWallet,
    setMarketerUniquePin,
    checkMarketerUniquePin
};

