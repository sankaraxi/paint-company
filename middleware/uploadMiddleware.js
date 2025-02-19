const fileUpload = require("express-fileupload");

// Middleware to handle file uploads
module.exports = fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file limit
  abortOnLimit: true,
  responseOnLimit: "File size limit exceeded!",
});





