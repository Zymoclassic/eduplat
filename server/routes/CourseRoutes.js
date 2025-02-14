const express = require("express");
const courseRouter = express.Router();

// import functions from authController
const {  getAllCourses, getCourse, uploadCourse, editCourse, deleteCourse } = require("../controllers/courseController");

// define authentication routes
courseRouter.get('/', getAllCourses);
courseRouter.get('/:courseId', getCourse);
courseRouter.post('/upload-course', uploadCourse);
courseRouter.patch('/:courseId/edit-course-details', editCourse);
courseRouter.delete('/:courseId/delete-course', deleteCourse);


module.exports = courseRouter;

