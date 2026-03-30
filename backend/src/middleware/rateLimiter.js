// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// 30-second cooldown between OTP requests per IP
const otpLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 seconds
  max: 1, // limit each IP to 1 request per windowMs
  message: 'Too many OTP requests. Please wait before trying again.',
  standardHeaders: true, 
  legacyHeaders: false,
});

module.exports = otpLimiter;
