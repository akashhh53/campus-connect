const jwt = require("jsonwebtoken");
const redisClient = require("../config/redis");
const User = require("../models/userIdentity/user");


const userMiddleware = async (req, res, next) => {
  try {
    // 1️⃣ Get token (cookie OR Authorization header)
    const token =
      req.cookies?.token ||
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token required" });
    }

    // 2️⃣ Verify JWT
    const payload = jwt.verify(token, process.env.JWT_KEY);

    // 3️⃣ Check token blocklist (Redis)
    const isBlocked = await redisClient.exists(`token:${token}`);
    if (isBlocked) {
      return res.status(401).json({ message: "Token revoked" });
    }

    // 4️⃣ Fetch user
    const user = await User.findById(payload._id).populate("role");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // 5️⃣ Attach user to request
    req.user = user;
    req.token = token;

    next();

  } catch (err) {
    return res.status(401).json({
      message: "Unauthorized",
      error: err.message
    });
  }
};

module.exports = userMiddleware;