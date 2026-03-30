const User = require("../models/userIdentity/user");
const Role = require("../models/userIdentity/role");
const AdminInvite = require("../models/adminInvite/adminInvite");
const UserProfile = require("../models/userIdentity/userProfile");
const College=require("../models/userIdentity/college");
const validate = require('../utils/validate');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generateAccessToken, generateRefreshToken } = require('../utils/token');
const generateOTP = require('../utils/otp');
const sendMail = require('../utils/mailer');
const mongoose = require("mongoose");
const redisClient = require("../config/redis");
const crypto = require("crypto");



//register global admin
const registerGlobalAdmin = async (req, res) => {
  try {
    const { name, email, password, phone, dateOfBirth } = req.body;

    // 1️⃣ Find or create the globalAdmin role
    let globalAdminRole = await Role.findOne({ name: "globalAdmin" });
    if (!globalAdminRole) {
      globalAdminRole = await Role.create({ name: "globalAdmin" });
    }

    // 2️⃣ Check GLOBAL ADMIN LIMIT (MAX 2)
    const globalAdminCount = await User.countDocuments({
      role: globalAdminRole._id
    });

    if (globalAdminCount >= 2) {
      return res.status(403).json({
        message: "Maximum 2 Global Admins are allowed"
      });
    }

    // 3️⃣ Validate input (dummy collegeId for schema)
    try {
      validate({
        name,
        email,
        password,
        phone,
        dateOfBirth,
        role: globalAdminRole._id,
        collegeId: new mongoose.Types.ObjectId("000000000000000000000000"),

      });
    } catch (validationError) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validationError.message
      });
    }

    // 4️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5️⃣ Create Global Admin
    const newGlobalAdmin = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      dateOfBirth,
      role: globalAdminRole._id,
      collegeId: new mongoose.Types.ObjectId("000000000000000000000000"),
      provider: "local",
      isVerified: { email: true },
    });

    // 6️⃣ Generate tokens
    const accessToken = generateAccessToken(newGlobalAdmin);
    const refreshToken = generateRefreshToken(newGlobalAdmin);

    // 7️⃣ Set refresh token cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // 8️⃣ Send response
    res.status(201).json({
      message: "Global Admin registered successfully",
      accessToken,
      user: newGlobalAdmin,
    });

  } catch (err) {
    console.error(err);

    // Duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({
        message: `Duplicate ${field} detected`,
        value: err.keyValue[field]
      });
    }

    res.status(500).json({
      message: "Failed to register Global Admin",
      error: err.message
    });
  }
};

/**
 * Global Admin sends invite to become Admin
 */
const sendAdminInvite = async (req, res) => {
  try {
    const { email, collegeId } = req.body;
    if (!email || !collegeId) 
      return res.status(400).json({ message: "Email and collegeId are required" });

    // 1️⃣ Check if user already exists and has a role
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.role) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    // 2️⃣ Find the admin role
    const adminRole = await Role.findOne({ name: "admin" });
    if (!adminRole) return res.status(500).json({ message: "Admin role not found" });

    // 3️⃣ Check for existing active invite
    const existingInvite = await AdminInvite.findOne({
      email,
      collegeId,
      used: false,
      expiresAt: { $gt: new Date() },
    });
    if (existingInvite) return res.status(400).json({ message: "Active invite already exists" });

    // 4️⃣ Generate JWT token for invite (48h expiry)
    const payload = { 
      email, 
      role: adminRole._id, 
      collegeId, 
      type: "admin-invite", 
      invitedBy: req.user ? req.user._id : null 
    };
    const inviteToken = jwt.sign(payload, process.env.JWT_KEY, { expiresIn: "48h" });

    // 5️⃣ Save invite in DB
    await AdminInvite.create({
      email,
      role: adminRole._id,
      collegeId,
      token: inviteToken,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      invitedBy: req.user ? req.user._id : null,
    });

    // 6️⃣ Generate frontend link
    const frontendURL = process.env.FRONTEND_URL || `http://localhost:${process.env.PORT || 3000}`;
    const link = `${frontendURL}/accept-admin-invite?token=${inviteToken}`;

    // 7️⃣ Send email
    const html = `
      <div style="font-family:sans-serif; line-height:1.6;">
        <h2>Campus Connect – Admin Invitation</h2>
        <p>Hello,</p>
        <p>You have been invited to become an <strong>Admin</strong> for your college.</p>
        <p>Click below to accept the invitation (valid 48 hours):</p>
        <a href="${link}" style="background:#4CAF50;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Accept Invite</a>
        <p>If you did not expect this email, ignore it.</p>
      </div>
    `;
    await sendMail(email, "Admin Invite – Campus Connect", html);

    res.status(201).json({ message: "Admin invite sent successfully", inviteExpiresAt: payload.exp });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send admin invite", error: err.message });
  }
};

/**
 * Accept admin invite & register
 * User clicks link → frontend registration page → POST /admin/accept-invite
 */
const acceptAdminInvite = async (req, res) => {
  try {
    const { token } = req.body; // frontend sends token from URL
    if (!token) return res.status(400).json({ message: "Invite token required" });

    // 1️⃣ Verify invite token (JWT)
    const payload = jwt.verify(token, process.env.JWT_KEY);
    if (payload.type !== "admin-invite") return res.status(400).json({ message: "Invalid invite token" });

    // 2️⃣ Check if invite is used or expired
    const invite = await AdminInvite.findOne({ token });
    if (!invite || invite.used || invite.expiresAt < new Date()) {
      return res.status(400).json({ message: "Invite expired or already used" });
    }

    // 3️⃣ Check if user already exists
    const existingUser = await User.findOne({ email: payload.email });
    if (existingUser) return res.status(400).json({ message: "User already registered" });

    // 4️⃣ Validate user input (name, DOB, phone, password, etc.)
    validate(req.body); // your validator from previous code

    const { name, password, phone, dateOfBirth } = req.body;

    // 5️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 6️⃣ Create user with admin role from invite
    const newUser = await User.create({
      name,
      email: payload.email,
      password: hashedPassword,
      phone,
      dateOfBirth,
      role: payload.role,
      collegeId: payload.collegeId,
      isVerified: { email: true },
    });

    // 7️⃣ Mark invite as used
    invite.used = true;
    await invite.save();

    // 8️⃣ Generate access & refresh tokens
    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // 9️⃣ Send response
    res.status(201).json({
      message: "Admin account created successfully",
      accessToken,
      user: newUser,
    });

  } catch (err) {
    console.error(err);
    if (err.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Invite token expired" });
    }
    res.status(500).json({ message: "Failed to accept admin invite", error: err.message });
  }
};

/**
 * Generic user registration for roles:
 * student, teacher, alumni
 */
const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, dateOfBirth, role: roleName, collegeId } = req.body;

    // 1️⃣ Find the role in DB
    const role = await Role.findOne({ name: roleName });
    if (!role) return res.status(400).json({ message: "Role not found" });

    // 2️⃣ Check if email or phone already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User with this email already exists" });

    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) return res.status(400).json({ message: "User with this phone already exists" });
    }

    // 3️⃣ Validate input
    try {
      validate({
        name,
        email,
        password,
        phone,
        dateOfBirth,
        role: role._id,
        collegeId,
      });
    } catch (validationError) {
      return res.status(400).json({ message: "Validation failed", errors: validationError.message });
    }

    // 4️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5️⃣ Create user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      dateOfBirth,
      role: role._id,
      collegeId,
      provider: "local",
      isVerified: { email: true }, // optional, can set false if email verification is required
    });

    // 6️⃣ Generate tokens
    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    // 7️⃣ Set refresh token cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // 8️⃣ Send response
    res.status(201).json({
      message: `${roleName.charAt(0).toUpperCase() + roleName.slice(1)} registered successfully`,
      accessToken,
      user: newUser,
    });

  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({ message: `Duplicate ${field} detected`, value: err.keyValue[field] });
    }
    res.status(500).json({ message: "Failed to register user", error: err.message });
  }
};

/**
 * Unified login for all roles (student, teacher, alumni, admin, globalAdmin)
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // 2️⃣ Find user
    const user = await User.findOne({ email })
      .select("+password")
      .populate("role", "name permissions allowedModules");

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 3️⃣ Check blocked
    if (user.isBlocked) {
      return res.status(403).json({ message: "Your account is blocked. Contact admin." });
    }

    // 4️⃣ Check email verified
    if (!user.isVerified.email) {
      return res.status(403).json({ message: "Please verify your email before logging in" });
    }

    // 5️⃣ Compare password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 6️⃣ Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // 7️⃣ Manage refresh tokens (max 5)
    if (user.refreshTokens.length >= 5) user.refreshTokens.shift();
    user.refreshTokens.push({
      token: refreshToken,
      createdAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // 8️⃣ Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // 🔥 9️⃣ SET BOTH COOKIES (IMPORTANT FIX)
    res.cookie("token", accessToken, {
      httpOnly: true,
      secure: false, // ⚠️ use true only in production (HTTPS)
      sameSite: "strict",
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false, // ⚠️ use true in production
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // 🔟 Send response
    const reply = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    res.status(200).json({
      message: "Login successful",
      accessToken, // optional (for frontend use)
      user: reply,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};



//social login 
const socialLogin = async (req, res) => {
  try {
    const {
      provider,
      providerId,
      email,
      name,
      avatar,
      role: roleName,
      collegeId
    } = req.body;

    if (!provider || !providerId || !email) {
      return res.status(400).json({ message: "Missing required social login data" });
    }

    // 1️⃣ Check existing user
    let user = await User.findOne({
      email,
      provider,
      providerId
    }).populate("role");

    // ================== LOGIN ==================
    if (user) {
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // 🔥 SET BOTH COOKIES (IMPORTANT)
      res.cookie("token", accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: 15 * 60 * 1000
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return res.status(200).json({
        message: "Social login successful",
        accessToken,
        user
      });
    }

    // ================== SIGNUP ==================
    if (!roleName || !collegeId) {
      return res.status(400).json({
        message: "Role and college are required for first-time social login"
      });
    }

    const role = await Role.findOne({ name: roleName });
    if (!role) {
      return res.status(400).json({ message: "Invalid role" });
    }

    user = await User.create({
      name,
      email,
      avatar,
      provider,
      providerId,
      role: role._id,
      collegeId,
      isVerified: { email: true }
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // 🔥 SET BOTH COOKIES (IMPORTANT)
    res.cookie("token", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 15 * 60 * 1000
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      message: "Account created via social login",
      accessToken,
      user
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Social login failed",
      error: err.message
    });
  }
};

//validate the token and logout the user by removing the refresh token 
// from the database and blacklisting the
//  access token in Redis. This ensures that the user is logged out from all 
// devices and cannot use any existing tokens to access protected routes.
const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        message: "No refresh token found"
      });
    }

    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 🧹 Remove current refresh token
    user.refreshTokens = user.refreshTokens.filter(
      (rt) => rt.token !== refreshToken
    );

    await user.save();

    // ✅ Use token from middleware
    const accessToken = req.token;

    if (accessToken) {
      const decoded = jwt.decode(accessToken);
      const expiry = decoded.exp - Math.floor(Date.now() / 1000);

      await redisClient.setEx(
        `token:${accessToken}`,
        expiry,
        "blocked"
      );
    }

    // 🍪 Clear cookies
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict"
    });

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict"
    });

    return res.status(200).json({
      message: "Logged out successfully"
    });

  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      message: "Logout failed",
      error: error.message
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1️⃣ Fetch user with role + college
    const user = await User.findById(userId)
      .populate("role", "name permissions allowedModules")
      .populate("collegeId", "name code location")
      .select("-password -refreshTokens");

    // 2️⃣ Fetch profile
    const profile = await UserProfile.findOne({ userId });

    // 3️⃣ Response
    const response = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      college: user.collegeId,
      globalOptIn: user.globalOptIn,
      lastLoginAt: user.lastLoginAt,
      profile: profile || null,
    };

    res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      data: response,
    });

  } catch (error) {
    console.error("Profile Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      message: error.message
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const { name, phone, globalOptIn } = req.body;

    // 1️⃣ Update User basic fields
    const user = await User.findByIdAndUpdate(
      userId,
      {
        name,
        phone,
        globalOptIn
      },
      { new: true, runValidators: true }
    ).select("-password -refreshTokens");

    // 2️⃣ Update or Create UserProfile
    let profile = await UserProfile.findOne({ userId });

    if (profile) {
      // update existing
      profile = await UserProfile.findOneAndUpdate(
        { userId },
        req.body.profile, // { bio, dob, etc. }
        { new: true }
      );
    } else {
      // create new
      profile = await UserProfile.create({
        userId,
        ...req.body.profile
      });
    }

    // 3️⃣ Response
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user,
        profile
      }
    });

  } catch (error) {
    console.error("Update Profile Error:", error.message);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Hash token and save to user
    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    // Email content
    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`; // frontend link
    const html = `
      <h3>Password Reset Request</h3>
      <p>Click the link below to reset your password. The link expires in 15 minutes:</p>
      <a href="${resetUrl}">${resetUrl}</a>
    `;

    await sendMail(user.email, "CampusConnect - Reset Password", html);

    res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error",
      message: error.message
     });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)
      return res.status(400).json({ message: "Token and new password are required" });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user by token and check expiry
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    }).select("+password"); // include password for hashing

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Clear reset fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


//ONLY ADMIN CAN CHANGE ROLE
const updateRole = async (req, res) => {
  try {
   
      const { roleId, userId } = req.body;
    // 1️⃣ Validate input
    if (!roleId || !userId) {
      return res.status(400).json({
        message: "Role ID and User ID are required",
      });
    }

    // 2️⃣ Allow only admin OR global_admin
    const allowedRoles = ["admin", "globalAdmin"];

    if (!allowedRoles.includes(req.user.role?.name)) {
      return res.status(403).json({
        message: "Only admin or global admin can update roles",
      });
    }

    // 3️⃣ Update role
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { role: roleId },
      { new: true }
    ).populate("role", "name permissions");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Role updated successfully",
      user: updatedUser,
    });

  } catch (error) {
    console.error("ERROR:", error);  // 👈 IMPORTANT
    res.status(500).json({ message: "Server error" });
  }
};

const createCollege = async (req, res) => {
  try {
    const { name, code, location, logoUrl } = req.body;

    // 🔐 Only global admin allowed
    const roleName = req.user.role?.name;

    if (roleName !== "globalAdmin") {
      return res.status(403).json({
        message: "Only global admin can create college",
      });
    }

    // ❌ validation
    if (!name || !code) {
      return res.status(400).json({
        message: "Name and code are required",
      });
    }

    // ❌ duplicate check
    const exists = await College.findOne({ code: code.toUpperCase() });
    if (exists) {
      return res.status(400).json({
        message: "College already exists",
      });
    }

    // ✅ create
    const college = await College.create({
      name,
      code,
      location: {
        city: location?.city,
        state: location?.state,
        country: location?.country || "India",
      },
      logoUrl,
    });

    res.status(201).json({
      message: "College created successfully",
      college,
    });

  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateClg = async (req, res) => {
  try {
    const { collegeId } = req.body;

    // 🔍 Debug (optional)
    console.log("User:", req.user._id);
    console.log("Body:", req.body);

    // ❌ Validation
    if (!collegeId) {
      return res.status(400).json({
        message: "College ID is required",
      });
    }

    // ❌ Check if college exists
    const collegeExists = await College.findById(collegeId);
    if (!collegeExists) {
      return res.status(400).json({
        message: "Invalid college ID",
      });
    }

    // ❌ Check if user exists (extra safety)
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // ✅ Update
    user.collegeId = collegeId;
    await user.save();

    // ✅ Populate after update
    const updatedUser = await User.findById(req.user._id)
      .populate("collegeId", "name code location");

    res.status(200).json({
      message: "College updated successfully",
      user: updatedUser,
    });

  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  sendAdminInvite,
  acceptAdminInvite,
  registerGlobalAdmin,
  registerUser,
  loginUser,
  socialLogin,
  logout,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  updateRole,
  updateClg,
  createCollege

};





