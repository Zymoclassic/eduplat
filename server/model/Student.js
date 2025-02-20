const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const studentSchema = new Schema({
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
    studentId: {
        type: String,
        default: null
    },
    image: {
        type: String,
        default: null
    },
    referrerID: {
        type: mongoose.Types.ObjectId,
        ref: "Marketer",
        required: false,
        default: null
    },
    paymentStructure: {
        type: String,
        enum: ["full", "half"]
    },
    learningMode: {
        type: String,
        enum: ["onsite", "virtual"]
    },
    paymentStatus: {
        type: String,
        default: "unpaid",
        enum: ["completed", "partial", "unpaid"]
    },
    balance: {
        type: Number,
        default: 0
    },
    amountPayable: {
        type: Number,
        default: 0
    },
    amountPaid: {
        type: Number,
        default: 0
    },
    transactions: [
        {
            reference: {type: String, required: true},
            amount: {type: Number, required: true},
            status: {type: String, enum: ["pending", "success", "failed"], default: "pending"},
            transactionDate: {type: Date, default: Date.now}
        }
    ],
    uniquePin: {
        type: String,
        default: null
    },
    course: [{
        type: mongoose.Types.ObjectId,
        ref: "Course"
    }],
    bankDetails: {
        accountName: {
            type: String,
            trim: true,
            default: null,
        },
        accountNumber: {
            type: String,
            trim: true,
            default: null,
        },
        bankName: {
            type: String,
            trim: true,
            default: null,
        },
    },
    resetPasswordToken: { 
        type: String 
    },
    resetPasswordExpires: { 
        type: Date 
    }
}, { timestamps: true });


module.exports = mongoose.model("Student", studentSchema);

