const Marketer = require("../model/Marketer");
const Student = require("../model/Student");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const nodemailer = require('nodemailer');
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();


// Setup nodemailer transporter
const transporter = nodemailer.createTransport({
    service: "gmail",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
});


// Sign up
const signUp = async (req, res, next) => {
    const { firstName, lastName, email, password, confirmPassword, phoneNumber, location, userType, referrerID } = req.body; 

    if (!firstName || !lastName || !email || !password || !phoneNumber || !location || !userType) {
        return res.status(400).json({ message: "Fill in all details" });
    }

    const newEmail = email.toLowerCase();

    if (!["student", "marketer"].includes(userType.toLowerCase())) {
        return res.status(400).json({ message: "Invalid userType. Must be either 'student' or 'marketer'." });
    }

    const UserModel = userType.toLowerCase() === "student" ? Student : Marketer;

    let existingUser;
    try {
        existingUser = await UserModel.findOne({ email: newEmail });
    } catch (err) {
        return res.status(500).json({ message: "ERROR!!! Validation interrupted" });
    }

    if (existingUser) {
        return res.status(400).json({ message: "Pre-existing Member. Please use the Login page instead." });
    }

    if (password.trim().length < 8) {
        return res.status(400).json({ message: "Password is too short. It must be at least 8 characters long." });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match." });
    }

    let hashedPassword;
    try {
        const salt = await bcrypt.genSalt(10);
        hashedPassword = await bcrypt.hash(password, salt);
    } catch (err) {
        return res.status(500).json({ message: "Error! Please try again." });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const userData = {
        firstName,
        lastName,
        phoneNumber,
        email: newEmail,
        password: hashedPassword,
        location,
        userType: userType.toLowerCase(),
        otp,
        otpExpires,
        emailVerified: false,
    };

    let newReferrerID = null;

    if (userType.toLowerCase() === "student") {
        if (referrerID) {
            try {
                const marketer = await Marketer.findOne({ marketerId: referrerID });
                if (marketer) {
                    newReferrerID = marketer._id;
                } else {
                    return res.status(400).json({ message: "Invalid marketerId. No such marketer exists." });
                }
            } catch (err) {
                return res.status(500).json({ message: "Error fetching marketer data." });
            }

            if (!mongoose.Types.ObjectId.isValid(newReferrerID)) {
                return res.status(400).json({ message: "Invalid referrer ID format." });
            }

            const referrer = await Marketer.findById(newReferrerID);
            if (!referrer) {
                return res.status(400).json({ message: "Referrer not found. Please enter a valid marketer ID." });
            }

            userData.referrerID = newReferrerID;
        } else {
            userData.referrerID = null;
        }

        userData.course = [];
    }

    if (userType.toLowerCase() === "marketer") {
        userData.referredStudents = [];

        const generateMarketerId = () => Math.floor(100000 + Math.random() * 900000).toString();

        const isMarketerIdUnique = async (id) => {
            const existingMarketer = await Marketer.findOne({ marketerId: id });
            return !existingMarketer;
        };

        const generateUniqueMarketerId = async () => {
            let newId;
            let isUnique = false;

            while (!isUnique) {
                newId = generateMarketerId();
                isUnique = await isMarketerIdUnique(newId);
            }

            return newId;
        };

        userData.marketerId = await generateUniqueMarketerId();
    }


    const mailOptions = {
        from: process.env.EMAIL,
        to: newEmail,
        subject: 'Account Verification OTP - TechX',
        html: `<h3>Welcome to TechX!</h3>
               <p>Your OTP for verification is: <strong>${otp}</strong></p>
               <p>This OTP will expire in 10 minutes.</p>`
    };

    try {
        // **SEND EMAIL BEFORE SAVING USER**
        await transporter.sendMail(mailOptions);

        // If email is sent successfully, create user
        const newUser = new UserModel(userData);
        await newUser.save();

        if (userType.toLowerCase() === "student" && newReferrerID) {
            await Marketer.findByIdAndUpdate(newReferrerID, {
                $push: { referredStudents: newUser._id }
            });
        }

        return res.status(201).json({ 
            newUser, 
            message: `Account successfully created as a ${userType}. Welcome to TechX! Kindly check your mail for a token sent for email verification.` 
        });

    } catch (err) {
        console.error('Error sending email:', err);
        return res.status(500).json({ message: "Error sending OTP email. Account not created." });
    }
};


// for verifying email
const verifyOtp = async (req, res) => {
    const { email, otp, userType } = req.body;

    if (!email || !otp || !userType) {
        return res.status(400).json({ message: "Email, userType and OTP are required" });
    }


    const newEmail = email.toLowerCase();

    if (!["student", "marketer"].includes(userType.toLowerCase())) {
        return res.status(400).json({ message: "Invalid userType. Must be either 'student' or 'marketer'." });
    }

    const UserModel = userType.toLowerCase() === "student" ? Student : Marketer;

    let user;
    try {
        user = await UserModel.findOne({ email: newEmail });
    } catch (err) {
        return res.status(500).json({ message: "ERROR!!! Validation interrupted" });
    }


    if (!user) {
        return res.status(400).json({ message: "User not found." });
    }

    if (user.emailVerified) {
        return res.status(400).json({ message: "User already verified." });
    }

    if (user.otp !== otp) {
        return res.status(400).json({ message: "Invalid OTP. Please try again." });
    }

    if (Date.now() > user.otpExpires) {
        return res.status(400).json({ message: "OTP expired. Please request a new one." });
    }

    // Mark email as verified and clear OTP fields
    user.emailVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    return res.status(200).json({
        message: `OTP verified successfully. Your ${userType} account is now active.`,
    });
};



const resendOtp = async (req, res) => {
    const { email, userType } = req.body;

    if (!email || !userType) {
        return res.status(400).json({ message: "Email and UserType is required" });
    }

    const newEmail = email.toLowerCase();

    if (!["student", "marketer"].includes(userType.toLowerCase())) {
        return res.status(400).json({ message: "Invalid userType. Must be either 'student' or 'marketer'." });
    }

    const UserModel = userType.toLowerCase() === "student" ? Student : Marketer;

    let user;
    try {
        user = await UserModel.findOne({ email: newEmail });
    } catch (err) {
        return res.status(500).json({ message: "ERROR!!! Validation interrupted" });
    }

    if (!user) {
        return res.status(400).json({ message: "User not found." });
    }

    if (user.emailVerified) {
        return res.status(400).json({ message: "User already verified." });
    }

    const newOtp = Math.floor(1000 + Math.random() * 9000);
    user.otp = newOtp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();


    const mailOptions = {
        from: process.env.EMAIL,
        to: newEmail,
        subject: 'New OTP - TechX',
        html: `<h3>Your new OTP for verification is: <strong>${newOtp}</strong></h3>
               <p>This OTP will expire in 10 minutes.</p>`
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.log('Error sending email: ', err);
            return res.status(500).json({ message: "Error sending new OTP email." });
        }
        console.log('New OTP email sent: ', info.response);
    });

    return res.status(200).json({ message: "New OTP sent successfully. Check your email." });
};


// Log-in
const logIn = async (req, res, next) => {
    const { email, password, userType } = req.body;

    // Validate user input
    if (!email || !password || !userType) {
        return res.status(400).json({ message: "Fill in all details." });
    }

    // Convert email to lowercase
    const newEmail = email.toLowerCase();

    // Validate userType
    if (!["student", "marketer"].includes(userType.toLowerCase())) {
        return res.status(400).json({ message: "Invalid userType. Must be either 'student' or 'marketer'." });
    }

    // Determine user model
    const UserModel = userType.toLowerCase() === "student" ? Student : Marketer;

    try {
        // Find user by email
        const existingUser = await UserModel.findOne({ email: newEmail });

        if (!existingUser) {
            return res.status(404).json({ message: "Email or Password is invalid." });
        }

        // Check if email is verified, if not, send a new OTP
        if (!existingUser.emailVerified) {
            const newOtp = Math.floor(1000 + Math.random() * 9000);
            existingUser.otp = newOtp;
            existingUser.otpExpires = Date.now() + 10 * 60 * 1000;
            await existingUser.save();

            const mailOptions = {
                from: process.env.EMAIL,
                to: newEmail,
                subject: "New OTP - TechX",
                html: `<h3>Your new OTP for verification is: <strong>${newOtp}</strong></h3>
                        <p>This OTP will expire in 10 minutes.</p>`
            };

            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.log("Error sending email: ", err);
                    return res.status(500).json({ message: "Error sending new OTP email." });
                }
                console.log("New OTP email sent: ", info.response);
            });

            return res.status(400).json({ message: "Please verify your email before logging in. A new OTP has been sent to your email." });
        }

        // Compare password
        const isPasswordCorrect = await bcrypt.compare(password, existingUser.password);

        if (!isPasswordCorrect) {
            return res.status(400).json({ message: "Password is invalid." });
        }

        // Generate JWT token
        const { _id: id, firstName, lastName } = existingUser;
        const token = jwt.sign({ id, firstName, lastName }, process.env.JWT_SECRET, { expiresIn: "1d" });

        // Set auth token in cookies
        res.cookie("authToken", token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 1 day
        });

        return res.status(200).json({
            message: "Login successful",
            token,
            id,
            name: `${firstName} ${lastName}`,
        });
    } catch (err) {
        return res.status(500).json({ message: "ERROR!!! Validation interrupted" });
    }
};


// forgot password
const forgotPassword = async (req, res) => {

    const { email, userType } = req.body;

    try { 
        if (!email || !userType) {
            return res.status(400).json({ message: "Email and UserType is required" });
        }
        const newEmail = email.toLowerCase();

        // Check if userType is valid
        if (!["student", "marketer"].includes(userType.toLowerCase())) {
            return res.status(400).json({ message: "Invalid userType. Must be either 'student' or 'marketer'." });
        }

        // Determine which model to use based on userType
        const UserModel = userType.toLowerCase() === "student" ? Student : Marketer;

        try {
            // Check in the model
            user = await UserModel.findOne({ email: newEmail });
        } catch (err) {
            return res.status(500).json({ message: "Error fetching user data." });
        }

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Generate 4-digit OTP
        const resetToken = Math.floor(1000 + Math.random() * 9000).toString();

        // Set token and expiry in the database
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
        await user.save();

        // Email options
        const mailOptions = {
            from: process.env.EMAIL,
            to: user.email,
            subject: "Password Reset Request",
            html: `<p>You requested a password reset.</p>
                   <p>Enter the token below to reset your password:</p>
                   <h2>${resetToken}</h2>
                   <p>This token will expire in 10 minutes.</p>`,
        };

        // Send email
        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: "A 4-digit OTP has been sent to your email.", email, userType, resetToken });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error processing request", error: error.message });
    }
};


const verifyResetOtp = async (req, res, next) => {

    const { email, token, userType } = req.body;

    try {

        if (!email || !token || !userType) {
            return res.status(400).json({ message: "Email, OTP, and userType are required." });
        }

        const newEmail = email.toLowerCase();
        // Check if userType is valid
        if (!["student", "marketer"].includes(userType.toLowerCase())) {
            return res.status(400).json({ message: "Invalid userType. Must be either 'student' or 'marketer'." });
        }

        // Determine which model to use based on userType
        const UserModel = userType.toLowerCase() === "student" ? Student : Marketer;

        try {
            // Check in the model
            user = await UserModel.findOne({ email: newEmail });
        } catch (err) {
            return res.status(500).json({ message: "Error fetching user data." });
        }
            

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Check if OTP is valid and not expired
        if (user.resetPasswordToken !== token || user.resetPasswordExpires < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired OTP." });
        }

        // OTP is valid → Allow redirection to reset password page
        res.status(200).json({ message: "OTP verified successfully, redirecting to the next page." });
    } catch (error) {
        res.status(500).json({ message: "Error processing request", error: error.message });
    }
};


const resetPassword = async (req, res) => {

    const { email, newPassword, confirmPassword, userType } = req.body;

    try {

        if (!email || !newPassword || !confirmPassword || !userType) {
            return res.status(400).json({ message: "All fields are required." });
        }

        const newEmail = email.toLowerCase();

        // Check if userType is valid
        if (!["student", "marketer"].includes(userType.toLowerCase())) {
            return res.status(400).json({ message: "Invalid userType. Must be either 'student' or 'marketer'." });
        }

        // Determine which model to use based on userType
        const UserModel = userType.toLowerCase() === "student" ? Student : Marketer;

        try {
            // Check in the model
            user = await UserModel.findOne({ email: newEmail });
        } catch (err) {
            return res.status(500).json({ message: "Error fetching user data." });
        }

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        if (newPassword.trim().length < 8) {
            return res.status(400).json({ message: "Password is too short. It must be at least 8 characters long." });
        }
    
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match." });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        // Clear OTP fields
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;

        await user.save();

        res.status(200).json({ message: "Password reset successful. You can now log in." });
    } catch (error) {
        res.status(500).json({ message: "Error processing request", error: error.message });
    }
};



module.exports = {
    signUp,
    verifyOtp,
    resendOtp,
    logIn,
    forgotPassword,
    verifyResetOtp,
    resetPassword
}

