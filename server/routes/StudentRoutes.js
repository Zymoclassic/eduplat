const express = require("express");
const studentRouter = express.Router();

// import functions from studentController
const {  getAllStudents, getStudent, editStudentDetails, enrollInCourse } = require("../controllers/studentController");

// define routes
studentRouter.get('/', getAllStudents);
studentRouter.get('/:id', getStudent);
studentRouter.patch('/:id/edit-details', editStudentDetails);
studentRouter.post('/:id/enroll/:courseId', enrollInCourse);

module.exports = studentRouter;

