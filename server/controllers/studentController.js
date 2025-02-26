const Student = require("../model/Student");
const Course = require("../model/Course");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const nodemailer = require('nodemailer');
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../utils/cloudinary"); // Import Cloudinary config
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
const getAllStudents = async (req, res, next) => {
    let students;
    try {
        students = await Student.find().select("-password");
    } catch (err) {
        return res.status(500).json({ message: "ERROR!!! Can not process it." });
    }
    if (!students) {
        return res.status(404).json({ message: "No student found!" });
    }
    return res.status(200).json({ students });
};

// check user profile
const getStudent = async (req, res, next) => {
    const id = req.params.id;
    let student;
    try {
        student = await Student.findById(id).select("-password");
    } catch (err) {
        return res.status(500).json({ message: "ERROR!!! Can not process it." });
    }
    if (!student) {
        return res.status(404).json({ message: "The user can not be found!" });
    }
    return res.status(200).json({ student });
};


// Change Profile Picture
const changeDp = async (req, res) => {
    try {

        const { id } = req.params;
        const userId = req.user.id;

        if (id !== userId) {
            return res.status(403).json({ message: "Unauthorized: You can only change your own profile image." });
        }

        if (!req.file) {
            return res.status(422).json({ message: "Please select an image." });
        }

        // Find the student
        const student = await Student.findById(id);
        if (!student) {
            return res.status(404).json({ message: "Student not found." });
        }

        // Check course enrollment
        if (!student.payments || student.payments.length === 0) {
            return res.status(403).json({ message: "You must be enrolled in at least one course to upload a profile image." });
        }

        // Delete old Cloudinary image (if exists)
        if (student.image) {
            const publicIdMatch = student.image.match(/\/([^/]+)\.[a-z]+$/);
            if (publicIdMatch) {
                const publicId = `student_profiles/${publicIdMatch[1]}`;
                await cloudinary.uploader.destroy(publicId);
            }
        }

        // Save new image URL from multer-cloudinary
        student.image = req.file.path;
        await student.save();

        return res.status(200).json({
            message: "File successfully uploaded.",
            image: student.image,
        });
    } catch (err) {
        console.error("Error processing request:", err);
        return res.status(500).json({ message: "An error occurred while processing your request." });
    }
};


// update user details
const editStudentDetails = async (req, res, next) => {
    try {
        const updates = req.body; // Get only the provided fields

        // Ensure at least one field is provided
        if (!Object.keys(updates).length) {
            return res.status(400).json({ message: "No fields provided for update" });
        }

        // Fetch user from database
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ message: "Specified student not found." });
        }

        // Update database information (only provided fields)
        const updatedStudent = await Student.findByIdAndUpdate(
            req.params.id,
            { $set: updates }, // To update only specified fields
            { new: true, runValidators: true }
        );

        return res.status(200).json({
            message: "Student details updated successfully",
            student: updatedStudent
        });


    } catch (err) {
        return res.status(500).json({ message: "ERROR!!! Cannot process request." });
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
        const student = await Student.findById(id);
        if (!student) {
            return res.status(404).json({ message: "Student not found." });
        }

        // Verify old password
        const isMatch = await bcrypt.compare(oldPassword, student.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Old password is incorrect." });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password in the database
        student.password = hashedPassword;
        await student.save();

        return res.status(200).json({ message: "Password changed successfully." });

    } catch (error) {
        return res.status(500).json({ message: "An error occurred while processing the data.", error: error.message });
    }
};


// check for enrolled courses
const enrolledCourse = async (req, res) => {
    try {
        const userId = req.user.id; // Assuming you have authentication middleware
        const student = await Student.findById(userId)
            .populate("payments.courseId", "title description price duration")
            .select("payments");

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const enrolledCourses = student.payments.map(payment => ({
            courseId: payment.courseId._id,
            title: payment.courseId.title,
            description: payment.courseId.description,
            price: payment.courseId.price,
            duration: payment.courseId.duration,
            amountPaid: payment.amountPaid,
            amountPayable: payment.amountPayable,
            paymentStatus: payment.paymentStatus
        }));

        res.status(200).json({ enrolledCourses });
    } catch (error) {
        console.error("Error fetching enrolled courses:", error);
        res.status(500).json({ message: "Server error" });
    }
};




module.exports = {
    getAllStudents,
    getStudent,
    editStudentDetails,
    changeDp,
    changePassword,
    enrolledCourse
};

