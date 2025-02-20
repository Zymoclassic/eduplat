const Student = require("../model/Student");
const Marketer = require("../model/Marketer");
const mongoose = require("mongoose");
const nodemailer = require('nodemailer');
const banksData = require("../utils/bank.json");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();


// Setup nodemailer transporter
const transporter = nodemailer.createTransport({
    service: "gmail",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
});


// Get List of Banks
const getBankList = (req, res) => {
    res.status(200).json({ banks: banksData.banks });
};



/* ------------------------------------------------------- STUDENT -----------------------------------------------------------------*/

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


// Route to set the uniquePin (if it's not set)
const setStudentUniquePin = async (req, res) => {
    const { pin, confirmPin } = req.body;

    // Validate input
    if (!pin || !confirmPin) {
        return res.status(400).json({ message: "Pin and Confirm Pin are required." });
    }

    if (pin !== confirmPin) {
        return res.status(400).json({ message: "Pins do not match." });
    }

    try {
        const student = await Student.findById(req.user.id);
        if (!student) {
            return res.status(404).json({ message: "Student not found." });
        }

        if (student.uniquePin) {
            return res.status(400).json({ message: "Pin is already set." });
        }

        student.uniquePin = pin; // Save the confirmed pin
        await student.save();

        res.status(200).json({ message: "Unique pin set successfully." });
    } catch (error) {
        res.status(500).json({ message: "Error setting pin", error });
    }
};


// Route to change uniquePin (user must provide old pin)
const changeStudentPin = async (req, res) => {
    const { oldPin, newPin, confirmNewPin } = req.body;

    if (!oldPin || !newPin || !confirmNewPin) {
        return res.status(400).json({ message: "Old pin, new pin, and confirm new pin are required." });
    }

    if (newPin !== confirmNewPin) {
        return res.status(400).json({ message: "New pins do not match." });
    }

    try {
        const student = await Student.findById(req.user.id);
        if (!student) {
            return res.status(404).json({ message: "Student not found." });
        }

        if (student.uniquePin !== oldPin) {
            return res.status(400).json({ message: "Old pin is incorrect." });
        }

        student.uniquePin = newPin;
        await student.save();

        res.status(200).json({ message: "Pin changed successfully." });
    } catch (error) {
        res.status(500).json({ message: "Error changing pin", error });
    }
};


// Request PIN Reset - Generates and Sends Token
const requestSPinReset = async (req, res) => {
    try {
        const email = req.user.email; // Get email from authMiddleware
        const student = await Student.findOne({ email });

        if (!student) {
            return res.status(404).json({ message: "Student not found." });
        }

        // Generate a 4-digit numeric token
        const resetToken = Math.floor(1000 + Math.random() * 9000).toString();
        const resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

        // Send email with reset token
        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: "Reset Your PIN",
            text: `Your PIN reset code is: ${resetToken}. This code expires in 15 minutes.`,
        };

        const mailResponse = await transporter.sendMail(mailOptions);

        if (mailResponse.accepted.length > 0) {
            // Store token in database only if email is sent successfully
            student.resetPasswordToken = resetToken;
            student.resetPasswordExpires = resetTokenExpires;
            await student.save();
            
            return res.status(200).json({ message: "Reset token sent to email." });
        } else {
            return res.status(500).json({ message: "Error sending email. Try again." });
        }
    } catch (error) {
        res.status(500).json({ message: "Error processing request", error });
    }
};


// Verify Token before allowing PIN reset
const verifySResetToken = async (req, res) => {
    try {
        const { token } = req.body;
        const email = req.user.email;

        if (!token) {
            return res.status(400).json({ message: "Token is required." });
        }

        const student = await Student.findOne({ email, resetPasswordToken: token });

        if (!student) {
            return res.status(400).json({ message: "Invalid or expired token." });
        }

        if (new Date() > student.resetPasswordExpires) {
            student.resetPasswordToken = null;
            student.resetPasswordExpires = null;
            await student.save();
            return res.status(400).json({ message: "Token has expired. Request a new one." });
        }

        // Token is valid, allow PIN reset
        res.status(200).json({ message: "Token verified. You can now set a new PIN." });
    } catch (error) {
        res.status(500).json({ message: "Error verifying token", error });
    }
};


// Set New PIN after Token Verification (With Confirm Password)
const setSNewPin = async (req, res) => {
    try {
        const { newPin, confirmPin } = req.body;
        const email = req.user.email;

        if (!newPin || !confirmPin) {
            return res.status(400).json({ message: "Both PIN and Confirm PIN are required." });
        }

        if (newPin !== confirmPin) {
            return res.status(400).json({ message: "PIN and Confirm PIN do not match." });
        }

        const student = await Student.findOne({ email });

        if (!student) {
            return res.status(404).json({ message: "Student not found." });
        }

        // Update new PIN and clear reset token fields
        student.uniquePin = newPin;
        student.resetPasswordToken = null;
        student.resetPasswordExpires = null;
        await student.save();

        res.status(200).json({ message: "PIN has been successfully updated." });
    } catch (error) {
        res.status(500).json({ message: "Error setting new PIN", error });
    }
};


const saveSBankDetails = async (req, res) => {
    try {
        const { accountName, accountNumber, bankName } = req.body;
        const studentId = req.user.id;

        // Validate fields
        if (!accountName || !accountNumber || !bankName) {
            return res.status(400).json({ message: "All fields are required." });
        }

        if (!/^\d{10}$/.test(accountNumber)) {
            return res.status(400).json({ message: "Account number must be 10 digits." });
        }

        // Validate bank name from JSON file
        const validBanks = banksData.banks;
        if (!validBanks.includes(bankName)) {
            return res.status(400).json({ message: "Invalid bank name. Please select from the provided options." });
        }

        // Find the student
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: "Student not found." });
        }

        // Update bank details
        student.bankDetails = { accountName, accountNumber, bankName };
        await student.save();

        res.status(200).json({ message: "Bank details saved successfully.", bankDetails: student.bankDetails });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error", error });
    }
};



/* ------------------------------------------------------- MARKETER -----------------------------------------------------------------*/


// Middleware to check if student uniquePin is set
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
        console.log(error);
        return res.status(500).json({ message: "Server error", error });
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
const setMarketerUniquePin = async (req, res) => {
    const { pin, confirmPin } = req.body;

    // Validate input
    if (!pin || !confirmPin) {
        return res.status(400).json({ message: "Pin and Confirm Pin are required." });
    }

    if (pin !== confirmPin) {
        return res.status(400).json({ message: "Pins do not match." });
    }

    try {
        const marketer = await Marketer.findById(req.user.id);
        if (!marketer) {
            return res.status(404).json({ message: "Student not found." });
        }

        if (marketer.uniquePin) {
            return res.status(400).json({ message: "Pin is already set." });
        }

        marketer.uniquePin = pin; // Save the confirmed pin
        await marketer.save();

        res.status(200).json({ message: "Unique pin set successfully." });
    } catch (error) {
        res.status(500).json({ message: "Error setting pin", error });
    }
};


// Route to change uniquePin (user must provide old pin)
const changeMarketerPin = async (req, res) => {
    const { oldPin, newPin, confirmNewPin } = req.body;

    if (!oldPin || !newPin || !confirmNewPin) {
        return res.status(400).json({ message: "Old pin, new pin, and confirm new pin are required." });
    }

    if (newPin !== confirmNewPin) {
        return res.status(400).json({ message: "New pins do not match." });
    }

    try {
        const marketer = await Marketer.findById(req.user.id);
        if (!marketer) {
            return res.status(404).json({ message: "Marketer not found." });
        }

        if (marketer.uniquePin !== oldPin) {
            return res.status(400).json({ message: "Old pin is incorrect." });
        }

        marketer.uniquePin = newPin;
        await marketer.save();

        res.status(200).json({ message: "Pin changed successfully." });
    } catch (error) {
        res.status(500).json({ message: "Error changing pin", error });
    }
};


// Request PIN Reset - Generates and Sends Token
const requestMPinReset = async (req, res) => {
    try {
        const email = req.user.email; // Get email from authMiddleware
        const marketer = await Marketer.findOne({ email });

        if (!marketer) {
            return res.status(404).json({ message: "Marketer not found." });
        }

        // Generate a 4-digit numeric token
        const resetToken = Math.floor(1000 + Math.random() * 9000).toString();
        const resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

        // Send email with reset token
        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: "Reset Your PIN",
            text: `Your PIN reset code is: ${resetToken}. This code expires in 15 minutes.`,
        };

        const mailResponse = await transporter.sendMail(mailOptions);

        if (mailResponse.accepted.length > 0) {
            // Store token in database only if email is sent successfully
            marketer.resetPasswordToken = resetToken;
            marketer.resetPasswordExpires = resetTokenExpires;
            await marketer.save();
            
            return res.status(200).json({ message: "Reset token sent to email." });
        } else {
            return res.status(500).json({ message: "Error sending email. Try again." });
        }
    } catch (error) {
        res.status(500).json({ message: "Error processing request", error });
    }
};


// Verify Token before allowing PIN reset
const verifyMResetToken = async (req, res) => {
    try {
        const { token } = req.body;
        const email = req.user.email;

        if (!token) {
            return res.status(400).json({ message: "Token is required." });
        }

        const marketer = await Marketer.findOne({ email, resetPasswordToken: token });

        if (!marketer) {
            return res.status(400).json({ message: "Invalid or expired token." });
        }

        if (new Date() > marketer.resetPasswordExpires) {
            marketer.resetPasswordToken = null;
            marketer.resetPasswordExpires = null;
            await marketer.save();
            return res.status(400).json({ message: "Token has expired. Request a new one." });
        }

        // Token is valid, allow PIN reset
        res.status(200).json({ message: "Token verified. You can now set a new PIN." });
    } catch (error) {
        res.status(500).json({ message: "Error verifying token", error });
    }
};


// Set New PIN after Token Verification (With Confirm Password)
const setMNewPin = async (req, res) => {
    try {
        const { newPin, confirmPin } = req.body;
        const email = req.user.email;

        if (!newPin || !confirmPin) {
            return res.status(400).json({ message: "Both PIN and Confirm PIN are required." });
        }

        if (newPin !== confirmPin) {
            return res.status(400).json({ message: "PIN and Confirm PIN do not match." });
        }

        const marketer = await Marketer.findOne({ email });

        if (!marketer) {
            return res.status(404).json({ message: "Student not found." });
        }

        // Update new PIN and clear reset token fields
        marketer.uniquePin = newPin;
        marketer.resetPasswordToken = null;
        marketer.resetPasswordExpires = null;
        await marketer.save();

        res.status(200).json({ message: "PIN has been successfully updated." });
    } catch (error) {
        res.status(500).json({ message: "Error setting new PIN", error });
    }
};


const saveMBankDetails = async (req, res) => {
    try {
        const { accountName, accountNumber, bankName } = req.body;
        const studentId = req.user.id;

        // Validate fields
        if (!accountName || !accountNumber || !bankName) {
            return res.status(400).json({ message: "All fields are required." });
        }

        if (!/^\d{10}$/.test(accountNumber)) {
            return res.status(400).json({ message: "Account number must be 10 digits." });
        }

        // Validate bank name from JSON file
        const validBanks = banksData.banks;
        if (!validBanks.includes(bankName)) {
            return res.status(400).json({ message: "Invalid bank name. Please select from the provided options." });
        }

        // Find the student
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: "Student not found." });
        }

        // Update bank details
        student.bankDetails = { accountName, accountNumber, bankName };
        await student.save();

        res.status(200).json({ message: "Bank details saved successfully.", bankDetails: student.bankDetails });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error", error });
    }
};


module.exports = {
    viewStudentWallet,
    setStudentUniquePin,
    checkStudentUniquePin,
    viewMarketerWallet,
    setMarketerUniquePin,
    checkMarketerUniquePin,
    changeStudentPin,
    changeMarketerPin,
    requestSPinReset,
    requestMPinReset,
    verifySResetToken,
    verifyMResetToken,
    setSNewPin,
    setMNewPin,
    getBankList,
    saveSBankDetails,
    saveMBankDetails
};

