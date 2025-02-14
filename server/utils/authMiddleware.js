const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const authMiddleware = async (req, res, next) => {
    const auth = req.cookies.authToken;

    if (!auth) {
        return res.status(401).json({message: "Not authorized, please log in again."});
    }

    try {
        const verifyUser = jwt.verify(auth, process.env.JWT_SECRET);
        req.user = verifyUser;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Token expired." });
        }
        return res.status(403).json({message: "Unauthorized user."});
    }
};

module.exports = { authMiddleware };


