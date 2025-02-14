const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const marketerSchema = new Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    emailVerified: { 
        type: Boolean, 
        default: false 
    },
    otp: { 
        type: String 
    },
    otpExpires: { 
        type: Date 
    },
    password: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    userType: {
        type: String,
        required: true,
        enum: ["student", "marketer"]
    },
    marketerId: {
        type: String,
        required: false
    },
    referredStudents: [{
        type: mongoose.Types.ObjectId,
        ref: "Student",
        required: false
    }],
    uniquePin: {
        type: String,
        default: null
    },
    balance: {
        type: Number,
        default: 0
    },
    resetPasswordToken: { 
        type: String 
    },
    resetPasswordExpires: { 
        type: Date 
    }
}, { timestamps: true });

module.exports = mongoose.model("Marketer", marketerSchema);

