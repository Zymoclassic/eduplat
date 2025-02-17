const Student = require("../model/Student");
const Marketer = require("../model/Marketer");
const Course = require("../model/Course");
const axios = require('axios');
const crypto = require('crypto');
const dotenv = require("dotenv");
dotenv.config();


// Increase marketer balance when referred student registers
const updateMarketerBalance = async (studentId, amount) => {
    try {
        const student = await Student.findById(studentId);
        if (!student || !student.referrerID) return;

        const marketer = await Marketer.findById(student.referrerID);
        if (!marketer) return;

        const commission = amount * 0.15; // 15% commission
        marketer.balance += commission;
        await marketer.save();

        console.log(`Marketer ${marketer._id} credited with ₦${commission}`);
    } catch (err) {
        console.error("Error updating marketer balance:", err);
    }
};


// Initialize Payment
const initializePayment = async (req, res, next) => {
    try {
        const { email, courseId, paymentStructure, learningMode } = req.body;

        // Validate request data
        if (!email || !courseId || !paymentStructure || !learningMode) {
            return res.status(400).json({ message: "Email, courseId, and paymentStructure are required!" });
        }

        // Fetch course from the database
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: "Course not found!" });
        }

        let amount;
        if (paymentStructure === "full") {
            amount = course.price;
        } else if (paymentStructure === "half") {
            amount = course.price * 0.6;
        } else {
            return res.status(400).json({ message: "Invalid payment structure! Choose 'full' or 'half'." });
        }

        console.log("Initializing payment with email:", email, "Amount:", amount);

        const paystackURL = "https://api.paystack.co/transaction/initialize";
        const response = await axios.post(
            paystackURL,
            {
                email,
                amount: amount * 100, // Convert to kobo
                metadata: { courseId, learningMode, paymentStructure },
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        res.status(200).json({
            message: "Payment initialized",
            data: response.data,
            authorizationUrl: response.data.data.authorization_url,
        });
    } catch (error) {
        console.error("Error initializing payment:", error);
        res.status(500).json({ message: "Payment initialization failed", error: error.response?.data || error.message });
    }
};


// Verify Payment
const verifyPayment = async (req, res) => {
    try {
        const { reference } = req.query;

        console.log("Verifying payment with reference:", reference);

        const paystackURL = `https://api.paystack.co/transaction/verify/${reference}`;
        const response = await axios.get(paystackURL, {
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            },
        });

        if (response.data.data.status === "success") {
            res.status(200).json({ message: "Payment successful", data: response.data });
        } else if (response.data.data.status === "failed") {
            res.status(400).json({ message: "Payment failed", data: response.data });
        } else {
            res.status(500).json({ message: "Unexpected payment status", data: response.data });
        }
    } catch (error) {
        console.error("Error verifying payment:", error);
        res.status(500).json({ message: "Verification failed", error: error.response?.data || error.message });
    }
};


// webhook
const handleWebhook = async (req, res) => {
    try {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        const paystackSignature = req.headers["x-paystack-signature"];
        const hash = crypto.createHmac("sha512", secret).update(JSON.stringify(req.body)).digest("hex");

        if (hash !== paystackSignature) {
            return res.status(401).json({ message: "Unauthorized request" });
        }

        console.log("Verified webhook:", req.body);

        if (req.body.event === "charge.success") {
            console.log("Payment Successful:", req.body.data.reference);

            const { email } = req.body.data.customer;
            const amount = req.body.data.amount / 100; // Convert from kobo to naira
            const reference = req.body.data.reference;
            const status = req.body.data.status;
            const metadata = req.body.data.metadata || {}; // Extract metadata
            const { courseId, learningMode, paymentStructure } = metadata;

            // Ensure courseId is provided
            if (!courseId) {
                console.log("Course ID not provided in payment metadata.");
                return res.status(400).json({ message: "Course ID is required" });
            }

            // Find the student by email
            const user = await Student.findOne({ email });

            if (!user) {
                console.log(`Student with email ${email} not found.`);
                return res.status(404).json({ message: "Student not found" });
            }

            // Check if transaction already exists
            const existingTransaction = user.transactions.find(tx => tx.reference === reference);
            if (existingTransaction) {
                console.log(`Transaction ${reference} already recorded.`);
                return res.status(200).json({ message: "Transaction already recorded" });
            }

            // Get the course price
            const course = await Course.findById(courseId);
            if (!course) {
                console.log(`Course with ID ${courseId} not found.`);
                return res.status(404).json({ message: "Course not found" });
            }

            const coursePrice = course.price;

            // Validate payment amount
            if (amount !== coursePrice && amount !== coursePrice * 0.6) {
                console.log(`Invalid payment amount: ${amount}. Expected ${coursePrice} or ${coursePrice * 0.6}.`);
                return res.status(400).json({ message: "Invalid payment amount" });
            }

            // Add new transaction
            const newTransaction = {
                reference,
                amount,
                status,
                transactionDate: new Date()
            };

            user.transactions.push(newTransaction);
            user.amountPaid += amount;

            // Update payment status
            if (user.amountPaid >= coursePrice) {
                user.paymentStatus = "completed";
            } else {
                user.paymentStatus = "partial";
            }

            // Add ₦20,000 to student balance for any payment
            user.balance += 20000;
            console.log(`Student ${user.email} credited with ₦20,000.`);

            user.learningMode = learningMode;
            user.paymentStructure = paymentStructure;

            await user.save();
            console.log(`Transaction ${reference} recorded for ${user.email}.`);

            // Update marketer balance
            await updateMarketerBalance(user._id, amount);
            console.log(`Marketer balance updated for ${user._id}.`);

            return res.status(200).json({ message: "Payment recorded successfully" });
        }

        console.log("Unhandled event:", req.body.event);
        return res.status(200).json({ message: "Webhook received" });

    } catch (error) {
        console.error("Error processing webhook:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};


module.exports = { initializePayment, verifyPayment, handleWebhook };

