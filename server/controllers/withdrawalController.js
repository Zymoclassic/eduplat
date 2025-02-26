const mongoose = require("mongoose");
const Withdrawal = require("../model/Withdrawal");
const Student = require("../model/Student");
const Marketer = require("../model/Marketer");
const Notification = require("../model/Notification");
const { isValidObjectId, isValidUserModel, sendRealTimeNotification } = require("../utils/notificationMiddleware");


/*-------------------------------------------------       Admin        --------------------------------------------------------------------*/

// Get all withdrawals (Admin)
const getAllWithdrawals = async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find()
            .populate("user", "userModel firstName lastName email");
        return res.status(200).json(withdrawals);
    } catch (err) {
        console.error("Error fetching withdrawals:", err);
        return res.status(500).json({ message: "Server error. Unable to fetch withdrawals." });
    }
};


// Update withdrawal
const updateWithdrawalStatus = async (req, res) => {
    try {
        const { withdrawalId, status } = req.body;

        if (!["approved", "rejected"].includes(status)) {
            return res.status(400).json({ message: "Invalid status." });
        }

        // Find the withdrawal request
        const withdrawal = await Withdrawal.findById(withdrawalId);
        if (!withdrawal) {
            return res.status(404).json({ message: "Withdrawal not found." });
        }

        if (withdrawal.status !== "pending") {
            return res.status(400).json({ message: "Withdrawal already processed." });
        }

        const user = await Student.findById(withdrawal.user) || await Marketer.findById(withdrawal.user);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }


        // Process the withdrawal
        if (status === "approved") {
            withdrawal.status = "approved";
            withdrawal.processedAt = new Date();

            // Only update `totalWithdrawn` if status is approved
            user.totalWithdrawn = user.totalWithdrawn + withdrawal.amount;
        } else if (status === "rejected") {
            user.balance += withdrawal.amount; // Refund balance
            withdrawal.status = "rejected";
            withdrawal.processedAt = new Date();
        }

        // Ensure `withdrawalHistory` is updated correctly
        const withdrawalIndex = user.withdrawalHistory.findIndex(w => 
            w.withdrawalId && w.withdrawalId.toString() === withdrawalId.toString()
        );

        if (withdrawalIndex !== -1) {
            user.withdrawalHistory[withdrawalIndex].status = withdrawal.status;
            user.withdrawalHistory[withdrawalIndex].processedAt = withdrawal.processedAt;
        } else {
            user.withdrawalHistory.push({
                withdrawalId: withdrawal._id,
                amount: withdrawal.amount,
                status: withdrawal.status,
                processedAt: withdrawal.processedAt,
            });
        }

        const withdrawalMessage = `Hello ${user.firstName}, Your withdrawal request of ₦${withdrawal.amount} has been ${withdrawal.status}.`;
        const userType = user.userType.charAt(0).toUpperCase() + user.userType.slice(1).toLowerCase();

        // ✅ **Send In-App Notification**
        const notification = new Notification({
            user: user._id,
            userModel: userType,
            title: `Withdrawal ${status}`,
            message: withdrawalMessage,
            type: "message",
        });
        
        // Send in-app notification
        sendRealTimeNotification(user._id, withdrawalMessage);


        await withdrawal.save();
        await user.save();
        await notification.save();


        return res.status(200).json({ message: `Withdrawal ${status} successfully.` });

    } catch (err) {
        console.error("Error updating withdrawal status:", err);
        return res.status(500).json({ message: "Server error. Unable to update withdrawal status." });
    }
};


/*------------------------------------------------- Withdrawal --------------------------------------------------------------------*/

const requestWithdrawal = async (req, res) => {
    const id = req.user.id;
    try {
        const { amount } = req.body;

        // Validate student ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid student ID." });
        }

        // Validate amount
        if (amount < 500) {
            return res.status(400).json({ message: "Cannot withdraw less than N500." });
        }


        // Find user
        const user = await Student.findById(id) || await Marketer.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Check if account details exist
        if (!user.bankDetails || !user.bankDetails.accountNumber || !user.bankDetails.accountName || !user.bankDetails.bankName) {
            return res.status(400).json({ message: "Account details are missing. Please update your bank details before making a withdrawal." });
        }

        // Check if student has enough balance
        if (user.balance < amount) {
            return res.status(400).json({ message: "Insufficient balance." });
        }

        // Generate a unique reference for the withdrawal
        const withdrawalReference = `WD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

        // Set expiration time (24 hours from now)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Create withdrawal request with `pendingVerification` status
        const withdrawal = new Withdrawal({
            user: id,
            userModel: user.constructor.modelName,
            amount,
            status: "pendingVerification", // Awaiting PIN verification
            reference: withdrawalReference,
            requestedAt: new Date(),
            expiresAt, // Auto-delete after 24 hours
            bankName: user.bankDetails.bankName,
            accountNumber: user.bankDetails.accountNumber,
            accountName: user.bankDetails.accountName
        });


        await withdrawal.save();

        return res.status(200).json({ 
            message: "Withdrawal request submitted. Please enter your unique PIN within 24 hours to proceed.", 
            reference: withdrawalReference,
        });

    } catch (err) {
        console.error("Error processing withdrawal request:", err);
        return res.status(500).json({ message: "Server error. Unable to process withdrawal request." });
    }
};


const verifyWithdrawal = async (req, res) => {
    try {
        const { reference, uniquePin } = req.body;
        const id = req.user.id;

        // Validate inputs
        if (!reference || !uniquePin) {
            return res.status(400).json({ message: "Reference and unique PIN are required." });
        }

        // Find the withdrawal request
        const withdrawal = await Withdrawal.findOne({ reference, user: id });
        if (!withdrawal) {
            return res.status(404).json({ message: "Withdrawal request not found." });
        }

        // Check if the withdrawal request has expired
        if (withdrawal.expiresAt && new Date() > withdrawal.expiresAt) {
            return res.status(400).json({ message: "This withdrawal request has expired." });
        }

        // Check if the withdrawal has already been verified
        if (withdrawal.status !== "pendingVerification") {
            return res.status(400).json({ message: "This withdrawal has already been verified and cannot be processed again." });
        }


        // Find user and check their PIN
        const user = await Student.findById(withdrawal.user) || await Marketer.findById(withdrawal.user);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Verify the PIN
        if (user.uniquePin !== uniquePin) {
            return res.status(400).json({ message: "Invalid PIN. Please try again." });
        }

        // Deduct from the user balance
        user.balance -= withdrawal.amount;

        // Update the withdrawal status to "pending"
        withdrawal.status = "pending";
        withdrawal.verifiedAt = new Date(); // Store when it was verified
        withdrawal.expiresAt = new Date("2099-12-31"); // Prevent expiry
        await withdrawal.save();

        const withdrawalIndex = user.withdrawalHistory.findIndex(w => w.withdrawalId.toString() === withdrawal._id.toString());

        if (withdrawalIndex !== -1) {
            user.withdrawalHistory[withdrawalIndex].status = withdrawal.status;
            user.withdrawalHistory[withdrawalIndex].processedAt = withdrawal.processedAt;
        } else {
            user.withdrawalHistory.push({
                withdrawalId: withdrawal._id,
                amount: withdrawal.amount,
                status: withdrawal.status,
                processedAt: withdrawal.processedAt,
            });
        }

        await user.save();

        const withdrawalMessage = `Hello ${user.firstName}, You just intiated a withdrawal request of ₦${withdrawal.amount}. Your payment will arrive shortly.`;

        // ✅ **Send In-App Notification**
        const notification = new Notification({
            user: id,
            userModel: user.userType.charAt(0).toUpperCase() + user.userType.slice(1).toLowerCase(),
            title: "Withdrawal initiated",
            message: withdrawalMessage,
            type: "message",
        });
        
        // Send in-app notification
        sendRealTimeNotification(id, withdrawalMessage);

        await notification.save();

        return res.status(200).json({ message: "Withdrawal request verified successfully. Processing..." });

    } catch (err) {
        console.error("Error verifying withdrawal:", err);
        return res.status(500).json({ message: "Server error. Unable to verify withdrawal." });
    }
};


const getUserWithdrawals = async (req, res) => {
    try {
        const id = req.user.id;

        if (!id) {
            return res.status(400).json({ message: "User ID is required." });
        }

        // Check if user exists in either Student or Marketer model
        let user = await Student.findById(id).populate("withdrawalHistory", "withdrawalId amount status processedAt");
        let userType = "Student";

        if (!user) {
            user = await Marketer.findById(id).populate("withdrawalHistory", "withdrawalId amount status processedAt");
            userType = "Marketer";
        }

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        return res.status(200).json({
            userType,
            withdrawals: user.withdrawalHistory
        });

    } catch (err) {
        console.error("Error fetching user withdrawals:", err);
        return res.status(500).json({ message: "Server error. Unable to fetch withdrawal history." });
    }
};



module.exports = {
    updateWithdrawalStatus,
    getAllWithdrawals,
    requestWithdrawal,
    verifyWithdrawal,
    getUserWithdrawals,
};

