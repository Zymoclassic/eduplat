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
    commissions: [
        {
            student: { type: mongoose.Types.ObjectId, ref: "Student", required: true },
            amountEarned: { type: Number, required: true },
            reference: { type: String, required: true },
            paymentDate: { type: Date, default: Date.now }
        }
    ],
    withdrawals: [
        {
            amount: { type: Number, required: true },
            paymentDate: { type: Date, default: Date.now }
        }
    ],
    uniquePin: {
        type: String,
        default: null
    },
    balance: {
        type: Number,
        default: 0
    },
    withdrawalHistory: [
        {
            withdrawalId: { type: mongoose.Schema.Types.ObjectId, ref: "Withdrawal" },
            amount: { type: Number, required: true },
            status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
            processedAt: { type: Date, default: Date.now }
        }
    ],
    totalWithdrawn: {
        type: Number,
        default: 0
    },
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

module.exports = mongoose.model("Marketer", marketerSchema);

