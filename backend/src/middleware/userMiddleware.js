const jwt = require("jsonwebtoken");
const redisClient = require("../config/redis");
const User = require("../models/userIdentity/user");

const userMiddleware = async (req, res, next) => {
  try {
    // Get token from cookie OR Authorization header

    const authHeader = req.headers.authorization;

    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : req.cookies?.token;
    if (!token) {
      return res.status(401).json({
        message: "Token required",
      });
    }

    // Verify JWT

    const payload = jwt.verify(token, process.env.JWT_KEY);

    // Check Redis blocklist

    const isBlocked = redisClient.isReady
      ? await redisClient.exists(`token:${token}`)
      : false;

    if (isBlocked) {
      return res.status(401).json({
        message: "Token revoked",
      });
    }

    // Get user

    const user = await User.findById(payload._id).populate("role");

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    req.user = user;
    req.token = token;

    next();
  } catch (err) {
    console.log("AUTH ERROR:", err.message);

    return res.status(401).json({
      message: err.message,
    });
  }
};

module.exports = userMiddleware;
