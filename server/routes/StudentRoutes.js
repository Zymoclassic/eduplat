const express = require("express");
const studentRouter = express.Router();

// import functions from studentController
const {  getAllStudents, getStudent, editStudentDetails, enrolledCourse } = require("../controllers/studentController");
const { authMiddleware } = require("../utils/authMiddleware");

// define routes
studentRouter.get('/', getAllStudents);
studentRouter.get('/:id', getStudent);
studentRouter.patch('/:id/edit-details', authMiddleware, editStudentDetails);
studentRouter.get('/:id/enrolled-course', authMiddleware, enrolledCourse);

module.exports = studentRouter;

