const Student = require("../model/Student");
const Marketer = require("../model/Marketer");
const Course = require("../model/Course");
const axios = require('axios');
const crypto = require('crypto');
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();


// Increase marketer balance when referred student registers
const updateMarketerBalance = async (studentId, amount, reference) => {
    try {
        const student = await Student.findById(studentId);
        if (!student || !student.referrerID) return;

        const marketer = await Marketer.findById(student.referrerID);
        if (!marketer) return;

        const commission = amount * 0.15; // 15% commission
        marketer.balance += commission;

        // Store commission transaction in marketer's schema
        marketer.commissions.push({
            student: studentId,
            amountEarned: commission,
            reference,
            paymentDate: new Date()
        });

        await marketer.save();

        console.log(`Marketer ${marketer._id} credited with ₦${commission}`);
    } catch (err) {
        console.error("Error updating marketer balance:", err);
    }
};


const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
    },
});


const sendPaymentEmail = async (email, amount, reference, paymentStatus) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: "Payment Confirmation - Your Transaction was Successful",
            html: `
                <h2>Payment Confirmation</h2>
                <p>Dear ${email},</p>
                <p>We have received your payment of <strong>₦${amount}</strong> with reference <strong>${reference}</strong>.</p>
                <p>Your current payment status is: <strong>${paymentStatus.toUpperCase()}</strong>.</p>
                <p>Thank you for your payment!</p>
                <p>Best regards,<br>Pageinnovations</p>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Payment email sent to ${email}`);
    } catch (error) {
        console.error("Error sending email:", error);
    }
};


const sendReferrerNotification = async (referrerEmail, studentName, amount) => {
    try {
            const mailOptions = {
                from: process.env.EMAIL,
                to: referrerEmail,
                subject: "Your Referral Just Made a Payment!",
                html: `
                    <p>Hello,</p>
                    <p>Your referred student <strong>${studentName}</strong> has just made a payment of ₦${amount.toLocaleString()}.</p>
                    <p>Thank you for your referral!</p>`
            };
    
            await transporter.sendMail(mailOptions);
            console.log(`Notification sent to referrer: ${referrerEmail}`);
    } catch (error) {
        console.error("Error sending referrer notification:", error);
    }
};


// Initialize Payment
const initializePayment = async (req, res, next) => {

    const email = req.user.email;

    try {
        const { courseId, paymentStructure, learningMode } = req.body;

        // Validate request data
        if (!email || !courseId || !paymentStructure || !learningMode) {
            return res.status(400).json({ message: "Course, Email, and Payment structure are required!" });
        }

        // Fetch course from the database
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: "Course not found!" });
        }

        let amount;
        if (paymentStructure === "full") {
            amount = course.price;
        } else if (paymentStructure === "part") {
            amount = course.price * 0.6;
        } else {
            return res.status(400).json({ message: "Invalid payment structure! Choose 'full' or 'part'." });
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


// Route for users to complete payment manually
const completePayment = async (req, res) => {

    const email = req.user.email;

    try {
        const { courseId } = req.body;

        if (!email || !courseId ) {
            return res.status(400).json({ message: "Email and course are required!" });
        }

        // Find the student
        const student = await Student.findOne({ email });
        if (!student) {
            return res.status(404).json({ message: "Student not found!" });
        }

        // Find the payment record for the course
        const paymentRecord = student.payments.find(payment => 
            payment.courseId.toString() === courseId
        );

        if (!paymentRecord) {
            return res.status(404).json({ message: "Payment record not found!" });
        }

        // Calculate remaining balance
        const balance = paymentRecord.amountPayable - paymentRecord.amountPaid;

        if (balance <= 0) {
            return res.status(400).json({ message: "No remaining balance. Payment already completed!" });
        }

        // Send payment request to Paystack
        const paystackURL = "https://api.paystack.co/transaction/initialize";
        const response = await axios.post(
            paystackURL,
            {
                email,
                amount: balance * 100, // Convert to kobo
                metadata: { courseId },
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        res.status(200).json({
            message: "Payment initiated successfully!",
            paystackData: response.data,
            authorizationUrl: response.data.data.authorization_url,
        });


    } catch (error) {
        console.error("Error updating payment:", error);
        res.status(500).json({ message: "Payment update failed", error: error.message });
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
        const hash = crypto.createHmac("sha512", secret)
            .update(JSON.stringify(req.body))
            .digest("hex");

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
            const metadata = req.body.data.metadata || {};
            const { courseId } = metadata;

            if (!courseId) {
                console.log("Course ID not provided in payment metadata.");
                return res.status(400).json({ message: "Course ID is required" });
            }

            const user = await Student.findOne({ email });
            if (!user) {
                console.log(`Student with email ${email} not found.`);
                return res.status(404).json({ message: "Student not found" });
            }

            const existingTransaction = user.payments.some(payment => 
                payment.transactions.some(tx => tx.reference === reference)
            );
            if (existingTransaction) {
                console.log(`Transaction ${reference} already recorded.`);
                return res.status(200).json({ message: "Transaction already recorded" });
            }

            const course = await Course.findById(courseId);
            if (!course) {
                console.log(`Course with ID ${courseId} not found.`);
                return res.status(404).json({ message: "Course not found" });
            }

            const coursePrice = course.price;
            let coursePayment = user.payments.find(p => p.courseId.equals(courseId));

            // ✅ Determine the payment type (full/partial)
            let paymentMade;
            if (amount >= coursePrice) {
                paymentMade = "completed";
            } else if (amount === coursePrice * 0.6) {
                paymentMade = "partial";
            }

            // ✅ If no existing payment record, create a new one
            if (!coursePayment) {
                coursePayment = {
                    courseId: course._id,
                    amountPaid: amount,
                    amountPayable: coursePrice,
                    paymentStatus: paymentMade,
                    transactions: [{ reference, amount, status, transactionDate: new Date() }]
                };
                user.payments.push(coursePayment);
            } else {
                // ✅ Ensure amount does not exceed required balance
                const remainingBalance = coursePayment.amountPayable - coursePayment.amountPaid;
                if (amount > remainingBalance) {
                    console.log(`Overpayment detected: Paid ${amount}, but only ${remainingBalance} needed.`);
                    return res.status(400).json({ message: "Payment exceeds required amount" });
                }

                // ✅ Record transaction
                coursePayment.transactions.push({ reference, amount, status, transactionDate: new Date() });
                coursePayment.amountPaid += amount;
            }

            // ✅ Check if payment is complete
            if (coursePayment.amountPaid >= coursePayment.amountPayable) {
                coursePayment.paymentStatus = "completed";
                console.log(`Payment completed for ${user.email} on course ${courseId}`);
            } else {
                coursePayment.paymentStatus = "partial";
                console.log(`Partial payment recorded for ${user.email}, remaining balance: ${coursePayment.amountPayable - coursePayment.amountPaid}`);
            }

            // ✅ Credit ₦20,000 **ONLY on first payment AND if the student has a referrer**
            if (user.payments.length === 1 && user.referrerID) {
                user.balance += 20000;
                console.log(`Student ${user.email} credited with ₦20,000 on first payment (Referrer: ${user.referrerID}).`);

                const referrer = await Marketer.findById(user.referrerID);
                if (referrer) {
                    await sendReferrerNotification(referrer.email, user.firstName, amount);
                    console.log(`Referrer ${referrer.email} notified about ${user.email}'s payment.`);
                }

                if (!user.earnings.some(earning => earning.reference === reference)) {
                    user.earnings.push({
                        amountEarned: 20000,
                        reference,
                        paymentDate: new Date()
                    });
                    console.log(`Earnings recorded for ${user.email}: ₦20,000.`);
                }
            }

            await user.save();
            console.log(`Transaction ${reference} recorded for ${user.email}.`);

            // ✅ Update marketer balance
            await updateMarketerBalance(user._id, amount, reference);
            console.log(`Marketer balance updated for ${user._id}.`);

            // ✅ Send payment confirmation email
            await sendPaymentEmail(user.email, amount, reference, coursePayment.paymentStatus);

            return res.status(200).json({ message: "Payment recorded successfully" });
        }

        console.log("Unhandled event:", req.body.event);
        return res.status(200).json({ message: "Webhook received" });
    } catch (error) {
        console.error("Error processing webhook:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};


module.exports = { initializePayment, completePayment, verifyPayment, handleWebhook };

