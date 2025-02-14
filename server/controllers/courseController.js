const Course = require("../model/Course");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const nodemailer = require('nodemailer');
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();


// gets all users
const getAllCourses = async (req, res, next) => {
    let courses;
    try {
        courses = await Course.find().select("-password");
    } catch (err) {
        return res.status(500).json({ message: "ERROR!!! Can not process it." });
    }
    if (!courses) {
        return res.status(404).json({ message: "No student found!" });
    }
    return res.status(200).json({ courses });
};


// check user profile
const getCourse = async (req, res, next) => {
    const id = req.params.id;
    let course;
    try {
        course = await Course.findById(id).select("-password");
    } catch (err) {
        return res.status(500).json({ message: "ERROR!!! Can not process it." });
    }
    if (!course) {
        return res.status(404).json({ message: "The user can not be found!" });
    }
    return res.status(200).json({ course });
};


// upload course
const uploadCourse = async (req, res, next) => {

    try {
        const { title, description, price, duration } = req.body;

        if (!title || !description || !price || !duration) {
            return res.status(400).json({ message: "Fill in all details" });
        }

        if (isNaN(price)) {
            return res.status(400).json({ message: "Price must be a valid number" });
        }

        const courseData = { title, description, price, duration };
        const newCourse = new Course(courseData);

        await newCourse.save();

        return res.status(201).json({
            message: "Course uploaded successfully",
            course: newCourse
        });
    } catch (err) {
        return res.status(500).json({ message: "ERROR!!! Can not process it." });
    }
};

const editCourse = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const updates = req.body; // Get only the fields that need to be updated

        if (!Object.keys(updates).length) {
            return res.status(400).json({ message: "No fields provided for update" });
        }

        if (updates.price && isNaN(updates.price)) {
            return res.status(400).json({ message: "Price must be a valid number" });
        }

        const updatedCourse = await Course.findByIdAndUpdate(courseId, updates, {
            new: true,
            runValidators: true
        });

        if (!updatedCourse) {
            return res.status(404).json({ message: "Course not found" });
        }

        return res.status(200).json({
            message: "Course updated successfully",
            course: updatedCourse
        });
    } catch (err) {
        return res.status(500).json({ message: "ERROR!!! Can not process it." });
    }
};



const deleteCourse = async (req, res, next) => {
    try {
        const { courseId } = req.params;

        const deletedCourse = await Course.findByIdAndDelete(courseId);

        if (!deletedCourse) {
            return res.status(404).json({ message: "Course not found" });
        }

        return res.status(200).json({ message: "Course deleted successfully" });
    } catch (err) {
        return res.status(500).json({ message: "ERROR!!! Can not process it." });
    }
};



module.exports = {
    getAllCourses,
    getCourse,
    uploadCourse,
    editCourse,
    deleteCourse
}

