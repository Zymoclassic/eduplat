const Student = require("../model/Student");
const Course = require("../model/Course");
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

// change avatar
// const changeDp = async (req, res, next) => {
//     try {
//         // Validate uploaded file
//         if (!req.files || !req.files.image) {
//             return res.status(422).json({ message: "Please select an image." });
//         }

//         const { image } = req.files;

//         // Check file size (2MB max)
//         if (image.size > 2 * 1024 * 1024) {
//             return res.status(400).json({ message: "File too large. Please upload a file smaller than 2MB." });
//         }

//         // Validate file type
//         const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
//         if (!allowedTypes.includes(image.mimetype)) {
//             return res.status(400).json({ message: "Invalid file type. Please upload a valid image." });
//         }

//         // Find the member
//         const student = await Student.findById(req.student.id);
//         if (!student) {
//             return res.status(404).json({ message: "Student not found." });
//         }

//         // Delete pre-existing profile image if it exists
//         if (student.image) {
//             const oldFilePath = path.join(__dirname, "..", "uploads", student.image);
//             try {
//                 await fs.unlink(oldFilePath);
//             } catch (err) {
//                 console.error("Error deleting old image:", err.message);
//                 // Log the error but continue processing
//             }
//         }

//         // Generate new unique filename
//         const rnum = () => Math.floor(1000 + Math.random() * 9000).toString();
//         const fileExtension = path.extname(image.name);
//         const newFileName = `${rnum()}${fileExtension}`;

//         // Define upload path
//         const uploadPath = path.join(__dirname, "..", "uploads", newFileName);

//         // Move uploaded file to destination
//         await image.mv(uploadPath);

//         // Update member record with the new image filename
//         student.image = newFileName;
//         await student.save();

//         return res.status(200).json({
//             message: "File successfully uploaded.",
//             image: newFileName,
//         });
//     } catch (err) {
//         return res.status(500).json({ message: "An error occurred while processing your request." });
//     }
// };


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


const verifyPayment = async (studentId, courseId, paymentReference) => {
    return paymentReference === "VALID_PAYMENT_REF";
};


// Generate a unique student ID (can be customized)
const generateStudentId = () => {
    return Math.floor(100000 + Math.random() * 900000);
};


// Enroll student after successful payment
// const enrollInCourse = async (req, res) => {
//     try {
//         const { studentId, courseId, paymentReference } = req.body;

//         // Validate input
//         if (!studentId || !courseId || !paymentReference) {
//             return res.status(400).json({ message: "Missing required fields" });
//         }

//         // Check if student exists
//         const student = await Student.findById(studentId);
//         if (!student) {
//             return res.status(404).json({ message: "Student not found" });
//         }

//         // Check if course exists
//         const course = await Course.findById(courseId);
//         if (!course) {
//             return res.status(404).json({ message: "Course not found" });
//         }

//         // Check if student is already enrolled
//         if (student.course.includes(courseId)) {
//             return res.status(400).json({ message: "Student already enrolled in this course" });
//         }

//         // Verify payment
//         const isPaymentValid = await verifyPayment(studentId, courseId, paymentReference);
//         if (!isPaymentValid) {
//             return res.status(400).json({ message: "Payment verification failed" });
//         }

//         // Assign student ID if not already assigned
//         if (!student.studentId) {
//             student.studentId = generateStudentId();
//         }

//         // Enroll student
//         student.course.push(courseId);
//         await student.save();

//         // Add student to course's enrollment list
//         course.studentsEnrolled.push(studentId);
//         await course.save();

//         return res.status(200).json({
//             message: "Enrollment successful",
//             studentId: student.studentId,
//             enrolledCourses: student.course
//         });
//     } catch (error) {
//         console.error("Error enrolling student:", error);
//         return res.status(500).json({ message: "Server error" });
//     }
// };


// Enroll student after successful payment
const enrollInCourse = async (req, res) => {

    const { id, courseId } = req.body;

    try {

        // Validate input
        if (!id || !courseId) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Check if student exists
        const student = await Student.findById(id);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Check if course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        // Check if student is already enrolled
        if (student.course.includes(courseId)) {
            return res.status(400).json({ message: "Student already enrolled in this course" });
        }

        // Assign student ID if not already assigned
        if (!student.studentId) {
            student.studentId = generateStudentId();
        }

        // Enroll student
        student.course.push(courseId);
        await student.save();

        // Add student to course's enrollment list
        course.studentsEnrolled.push(id);
        await course.save();

        return res.status(200).json({
            message: "Enrollment successful",
            studentId: student.studentId,
            enrolledCourses: student.course
        });
    } catch (error) {
        console.error("Error enrolling student:", error);
        return res.status(500).json({ message: "Server error" });
    }
};


module.exports = {
    getAllStudents,
    getStudent,
    editStudentDetails,
    enrollInCourse
}

