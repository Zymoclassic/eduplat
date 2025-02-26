const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { v2: cloudinary } = require("cloudinary");

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "student_profiles",
        allowed_formats: ["jpg", "jpeg", "png", "gif"],
    },
});

// Set up multer
const upload = multer({ storage });

module.exports = upload;
