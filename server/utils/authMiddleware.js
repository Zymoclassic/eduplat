const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();


const authMiddleware = async (req, res, next) => {
    let auth = req.headers.authorization || req.cookies.authToken;

    if (!auth) {
        return res.status(401).json({ message: "Not authorized, please log in again." });
    }

    // If the token is from the Authorization header, remove 'Bearer ' prefix if present
    if (auth.startsWith("Bearer ")) {
        auth = auth.split(" ")[1];
    }

    try {
        const verifyUser = jwt.verify(auth, process.env.JWT_SECRET);
        req.user = verifyUser;
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expired." });
        }
        return res.status(403).json({ message: "Unauthorized user." });
    }
};

module.exports = { authMiddleware };


