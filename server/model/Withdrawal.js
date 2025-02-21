const mongoose = require("mongoose");

const withdrawalSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "userModel" },
    userModel: { type: String, required: true, enum: ["Student", "Marketer"] },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pendingVerification", "pending", "approved", "rejected"], default: "pendingVerification" },
    reference: { type: String, unique: true, required: true },
    requestedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    bankName: { type: String },
    accountNumber: { type: String },
    accountName: { type: String }
});


module.exports = mongoose.model("Withdrawal", withdrawalSchema);

