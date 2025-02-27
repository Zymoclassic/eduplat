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
        default: "https://res.cloudinary.com/dq5puvtne/image/upload/v1740648447/next_crib_avatar_jled2z.jpg"
    },
    referrerID: {
        type: mongoose.Types.ObjectId,
        ref: "Marketer",
        required: false,
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
    payments: [
        {
            courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
            amountPaid: { type: Number, default: 0 },
            amountPayable: { type: Number, default: 0, required: true },
            paymentStatus: { type: String, enum: ["unpaid", "partial", "completed"], default: "unpaid" },
            paymentStructure: { type: String, enum: ["full", "part"] },
            learningMode: { type: String, enum: ["onsite", "virtual"] },
            transactions: [
                {
                    reference: String,
                    amount: Number,
                    status: String,
                    transactionDate: Date
                }
            ],
        },
    ],
    earnings: [
        {
            amountEarned: { type: Number, required: true },
            reference: { type: String, required: true },
            paymentDate: { type: Date, default: Date.now }
        }
    ],
    uniquePin: {
        type: String,
        default: null
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


module.exports = mongoose.model("Student", studentSchema);

