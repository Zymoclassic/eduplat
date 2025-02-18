const express = require("express");
const studentRouter = express.Router();

// import functions from studentController
const {  getAllStudents, getStudent, editStudentDetails, enrollInCourse } = require("../controllers/studentController");
const { authMiddleware } = require("../utils/authMiddleware");

// define routes
studentRouter.get('/', getAllStudents);
studentRouter.get('/:id', getStudent);
studentRouter.patch('/:id/edit-details', authMiddleware, editStudentDetails);
studentRouter.post('/:id/enroll/:courseId', authMiddleware, enrollInCourse);

module.exports = studentRouter;

