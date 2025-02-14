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

        const commission = amount * 0.2; // 20% commission
        marketer.balance += commission;
        await marketer.save();

        console.log(`Marketer ${marketer._id} credited with ₦${commission}`);
    } catch (err) {
        console.error("Error updating marketer balance:", err);
    }
};



// Initialize Payment
const initializePayment = async (req, res) => {
    try {
        const { email, amount } = req.body;

        console.log("Initializing payment with email:", email, "Amount:", amount);

        const paystackURL = "https://api.paystack.co/transaction/initialize";
        const response = await axios.post(paystackURL, {
            email,
            amount: amount * 100, // Convert to kobo
        }, {
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                "Content-Type": "application/json",
            },
        });

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


// Handle Webhook
const handleWebhook = async (req, res) => {
    try {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        const paystackSignature = req.headers["x-paystack-signature"];
        const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');

        if (hash !== paystackSignature) {
            return res.status(401).json({ message: "Unauthorized request" });
        }

        console.log("Verified webhook:", req.body);

        // Process event
        switch (req.body.event) {
            case "charge.success":
                console.log("Payment Successful:", req.body.data.reference);
                
                const email = req.body.data.customer.email;
                const amount = req.body.data.amount / 100; // Convert from kobo to naira

                // Find student and update course payment
                const user = await Student.findOne({ email });
                if (user) {
                    await Course.updateOne({ studentId: user._id }, { $set: { paymentStatus: "completed" } });
                    console.log(`User ${user.email}'s course payment updated.`);

                    // Update marketer balance with 20% commission
                    await updateMarketerBalance(user._id, amount);
                }

                return res.status(200).json({ message: "Payment recorded" });

            default:
                console.log("Unhandled event:", req.body.event);
        }

        res.status(200).json({ message: "Webhook received" });
    } catch (error) {
        console.error("Error processing webhook:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


module.exports = { initializePayment, verifyPayment, handleWebhook };
