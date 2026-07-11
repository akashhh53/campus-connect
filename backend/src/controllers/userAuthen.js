const User = require("../models/userIdentity/user");
const Role = require("../models/userIdentity/role");
const AdminInvite = require("../models/adminInvite/adminInvite");
const UserProfile = require("../models/userIdentity/userProfile");
const College = require("../models/userIdentity/college");
const validate = require("../utils/validate");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { generateAccessToken, generateRefreshToken } = require("../utils/token");
const generateOTP = require("../utils/otp");
const sendMail = require("../utils/mailer");
const {
  normalizeEmail,
  studentEmailMatchesCollege,
  getCollegeEmailDomains,
} = require("../utils/studentEmail");
const mongoose = require("mongoose");
const redisClient = require("../config/redis");
const crypto = require("crypto");

const normalizeURL = (url) => url?.trim().replace(/\/$/, "");

const frontendURLs = [
  process.env.FRONTEND_URL,
  process.env.PUBLIC_FRONTEND_URL,
  process.env.CLIENT_URL,
  process.env.APP_URL,
  ...(process.env.FRONTEND_URLS || "").split(","),
]
  .map(normalizeURL)
  .filter(Boolean);

const getRequestOrigin = (req) => {
  const origin = normalizeURL(req?.headers?.origin || req?.get?.("origin"));

  if (!origin || !/^https?:\/\//i.test(origin)) {
    return "";
  }

  return origin;
};

const getFrontendURL = (req) =>
  frontendURLs[0] || getRequestOrigin(req) || "http://localhost:5173";

const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.COOKIE_SECURE === "true" ||
  frontendURLs.some((url) => url.startsWith("https://"));

const authCookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
  priority: "high",
  maxAge,
});

const clearAuthCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
});

const ACCESS_TOKEN_COOKIE_MAX_AGE = 30 * 60 * 1000;
const REFRESH_TOKEN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const MAX_REFRESH_SESSIONS = Number(process.env.MAX_REFRESH_SESSIONS) || 5;

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie("token", accessToken, authCookieOptions(ACCESS_TOKEN_COOKIE_MAX_AGE));

  if (refreshToken) {
    res.cookie(
      "refreshToken",
      refreshToken,
      authCookieOptions(REFRESH_TOKEN_COOKIE_MAX_AGE),
    );
  }
};

const attachRefreshSession = async (user, refreshToken, req) => {
  const refreshCutoff = Date.now() - REFRESH_TOKEN_COOKIE_MAX_AGE;
  const existingSessions = Array.isArray(user.refreshTokens)
    ? user.refreshTokens.filter(
        (session) =>
          session.token &&
          session.token !== refreshToken &&
          new Date(session.createdAt || 0).getTime() > refreshCutoff,
      )
    : [];

  existingSessions.push({
    token: refreshToken,
    createdAt: new Date(),
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  user.refreshTokens = existingSessions.slice(-MAX_REFRESH_SESSIONS);
  user.lastLoginAt = new Date();

  await user.save();
};

const createAuthSession = async (user, req, res) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await attachRefreshSession(user, refreshToken, req);
  setAuthCookies(res, accessToken, refreshToken);

  return { accessToken, refreshToken };
};

const buildStudentEmailHint = (college) => {
  const emailDomains = getCollegeEmailDomains(college);

  if (emailDomains.length > 0) {
    return emailDomains[0];
  }

  return college?.code ? `${String(college.code).trim().toLowerCase()}.ac.in` : "";
};

const issueVerificationOTP = async (user) => {
  const { code, hash, expiresAt } = await generateOTP();

  user.otp = {
    code: hash,
    expiresAt,
  };
  user.lastOTPSentAt = new Date();
  user.otpAttempts = 0;

  await user.save();

  return code;
};

const sendVerificationOTPEmail = async (user, context = "verification") => {
  const otpCode = await issueVerificationOTP(user);
  const minutesValid = 10;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
      <h2 style="margin:0 0 12px;">Campus Connect email verification</h2>
      <p style="margin:0 0 12px;">Use this OTP to verify your campus email${context === "registration" ? " and finish registration" : ""}:</p>
      <div style="font-size:28px;letter-spacing:6px;font-weight:800;padding:16px 18px;border:1px solid #d1d5db;border-radius:12px;display:inline-block;background:#f9fafb;">${otpCode}</div>
      <p style="margin:12px 0 0;">This code expires in ${minutesValid} minutes.</p>
      <p style="margin:8px 0 0;color:#6b7280;">If you did not request this, you can ignore this email.</p>
    </div>
  `;

  await sendMail(user.email, "Campus Connect - Verify your email", html);

  return otpCode;
};

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
      role: globalAdminRole._id,
    });

    if (globalAdminCount >= 2) {
      return res.status(403).json({
        message: "Maximum 2 Global Admins are allowed",
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
        errors: validationError.message,
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

    // 6️⃣ Generate tokens/session
    const { accessToken } = await createAuthSession(newGlobalAdmin, req, res);
    await newGlobalAdmin.populate("role", "name permissions allowedModules");

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
        value: err.keyValue[field],
      });
    }

    res.status(500).json({
      message: "Failed to register Global Admin",
      error: err.message,
    });
  }
};

/**
 * Global Admin sends invite to become Admin
 */
const sendAdminInvite = async (req, res) => {
  try {
    // ✅ Ensure req.user exists
    if (!req.user || !req.user._id) {
      return res
        .status(401)
        .json({ message: "Authentication required to send invite" });
    }

    const { email, collegeId } = req.body;
    if (!email || !collegeId) {
      return res
        .status(400)
        .json({ message: "Email and collegeId are required" });
    }

    // 1️⃣ Check if user already exists with role
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.role) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    // 2️⃣ Find admin role
    const adminRole = await Role.findOne({ name: "admin" });
    if (!adminRole)
      return res.status(500).json({ message: "Admin role not found" });

    // 3️⃣ Check for existing active invite
    const existingInvite = await AdminInvite.findOne({
      email,
      collegeId,
      used: false,
      expiresAt: { $gt: new Date() },
    });
    if (existingInvite)
      return res.status(400).json({ message: "Active invite already exists" });

    // 4️⃣ Generate JWT token for invite (48h)
    const payload = {
      email,
      role: adminRole._id,
      collegeId,
      type: "admin-invite",
      invitedBy: req.user._id,
    };
    const inviteToken = jwt.sign(payload, process.env.JWT_KEY, {
      expiresIn: "48h",
    });

    // 5️⃣ Save invite in DB
    await AdminInvite.create({
      email,
      role: adminRole._id,
      collegeId,
      token: inviteToken,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      invitedBy: req.user._id, // ✅ guaranteed to exist
    });

    // 6️⃣ Generate frontend link
    const frontendURL = getFrontendURL(req);
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

    res.status(201).json({
      message: "Admin invite sent successfully",
      inviteExpiresAt: payload.exp,
    });
  } catch (err) {
    console.error("Send Admin Invite Error:", err);
    res
      .status(500)
      .json({ message: "Failed to send admin invite", error: err.message });
  }
};

/**
 * Accept admin invite & register
 * User clicks link → frontend registration page → POST /admin/accept-invite
 */
const acceptAdminInvite = async (req, res) => {
  try {
    // Use a unique name to avoid conflicts
    const inviteToken = req.body.token || req.query.token;

    const { name, password, phone, dateOfBirth } = req.body;

    if (!inviteToken) {
      return res.status(400).json({ message: "Invite token required" });
    }
    if (!name || !password || !phone || !dateOfBirth) {
      return res.status(400).json({ message: "Missing mandatory user fields" });
    }

    // Verify invite token
    let payload;
    try {
      payload = jwt.verify(inviteToken, process.env.JWT_KEY);
    } catch (err) {
      return res.status(400).json({
        message: "Invalid or expired invite token",
        error: err.message,
      });
    }

    if (payload.type !== "admin-invite") {
      return res.status(400).json({ message: "Invalid invite token type" });
    }

    const { email, role, collegeId } = payload;
    if (!email || !role || !collegeId) {
      return res.status(400).json({
        message: "Invite token missing required fields: email, role, collegeId",
      });
    }

    const invite = await AdminInvite.findOne({ token: inviteToken });
    if (!invite) return res.status(400).json({ message: "Invite not found" });
    if (invite.used)
      return res.status(400).json({ message: "Invite already used" });
    if (invite.expiresAt < new Date())
      return res.status(400).json({ message: "Invite expired" });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already registered" });

    const userData = {
      name,
      password,
      phone,
      dateOfBirth,
      email,
      role,
      collegeId,
    };
    validate(userData);

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      ...userData,
      password: hashedPassword,
      isVerified: { email: true },
    });

    invite.used = true;
    await invite.save();

    const { accessToken } = await createAuthSession(newUser, req, res);
    await newUser.populate("role", "name permissions allowedModules");

    res.status(201).json({
      message: "Admin account created successfully",
      accessToken,
      user: newUser,
    });
  } catch (err) {
    console.error("AcceptAdminInvite Error:", err);
    res
      .status(500)
      .json({ message: "Failed to accept admin invite", error: err.message });
  }
};
/**
 * Generic user registration for roles:
 * student, teacher, alumni
 */
const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      dateOfBirth,
      role: roleName,
      collegeId,
    } = req.body;

    const normalizedEmail = normalizeEmail(email);
    const normalizedName = typeof name === "string" ? name.trim() : name;
    const normalizedPhone = typeof phone === "string" ? phone.trim() : phone;
    const normalizedRoleName =
      typeof roleName === "string" ? roleName.trim() : roleName;

    // 1️⃣ Find the role in DB
    const role = await Role.findOne({ name: normalizedRoleName });
    if (!role) return res.status(400).json({ message: "Role not found" });

    const college = await College.findById(collegeId).select(
      "name code emailDomains",
    );
    if (!college) {
      return res.status(404).json({ message: "College not found" });
    }

    const isStudentRole = role.name === "student";
    if (isStudentRole && !studentEmailMatchesCollege(normalizedEmail, college)) {
      return res.status(400).json({
        message: `Student email must match the selected college,  Example: student.ug23@${buildStudentEmailHint(college)} or any email id that associated with this college`,
      });
    }

    // 2️⃣ Check if email or phone already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser)
      return res.status(409).json({
        message: existingUser.isVerified?.email
          ? "User with this email already exists"
          : "This email is already registered but not verified yet. Please verify the OTP.",
        requiresEmailVerification: !existingUser.isVerified?.email,
        email: existingUser.email,
      });

    if (normalizedPhone) {
      const existingPhone = await User.findOne({ phone: normalizedPhone });
      if (existingPhone)
        return res
          .status(400)
          .json({ message: "User with this phone already exists" });
    }

    // 3️⃣ Validate input
    try {
      validate({
        name: normalizedName,
        email: normalizedEmail,
        password,
        phone: normalizedPhone,
        dateOfBirth,
        role: role._id,
        collegeId,
      });
    } catch (validationError) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validationError.message,
      });
    }

    // 4️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5️⃣ Create user
    const newUser = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      phone: normalizedPhone,
      dateOfBirth,
      role: role._id,
      collegeId,
      provider: "local",
      isVerified: { email: !isStudentRole },
    });

    let verificationEmailSent = true;

    if (isStudentRole) {
      try {
        await sendVerificationOTPEmail(newUser, "registration");
      } catch (mailError) {
        verificationEmailSent = false;
        console.error("Student verification email error:", mailError);
      }
    }

    if (isStudentRole) {
      return res.status(201).json({
        message: verificationEmailSent
          ? "Student registered successfully. Check your email for the OTP."
          : "Student registered successfully, but the OTP email could not be sent. Please request a resend.",
        requiresEmailVerification: true,
        verificationEmailSent,
        email: newUser.email,
        user: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: role.name,
          collegeId: newUser.collegeId,
        },
      });
    }

    // 6️⃣ Generate tokens/session
    const { accessToken } = await createAuthSession(newUser, req, res);
    await newUser.populate("role", "name permissions allowedModules");

    // 8️⃣ Send response
    res.status(201).json({
      message: `${
        role.name.charAt(0).toUpperCase() + role.name.slice(1)
      } registered successfully`,
      accessToken,
      user: newUser,
    });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({
        message: `Duplicate ${field} detected`,
        value: err.keyValue[field],
      });
    }
    res
      .status(500)
      .json({ message: "Failed to register user", error: err.message });
  }
};

const requestOTP = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: normalizedEmail }).populate(
      "role",
      "name permissions allowedModules",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified?.email) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    if (
      user.lastOTPSentAt &&
      Date.now() - new Date(user.lastOTPSentAt).getTime() < 30 * 1000
    ) {
      return res.status(429).json({
        message: "Please wait before requesting another OTP",
      });
    }

    await sendVerificationOTPEmail(user, "verification");

    return res.status(200).json({
      message: "Verification OTP sent successfully",
    });
  } catch (error) {
    console.error("Request OTP Error:", error);
    return res.status(500).json({
      message: "Failed to send verification OTP",
      error: error.message,
    });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    const otp = typeof req.body.otp === "string" ? req.body.otp.trim() : "";

    if (!normalizedEmail || !otp) {
      return res
        .status(400)
        .json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email: normalizedEmail })
      .select("+otp.code +otp.expiresAt +otpAttempts +lastOTPSentAt +password")
      .populate("role", "name permissions allowedModules")
      .populate("collegeId", "name code emailDomains location");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified?.email) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    if (!user.otp?.code || !user.otp?.expiresAt) {
      return res.status(400).json({
        message: "OTP not found. Please request a new verification code.",
      });
    }

    if (user.otp.expiresAt.getTime() < Date.now()) {
      user.otp = undefined;
      user.lastOTPSentAt = undefined;
      user.otpAttempts = 0;
      await user.save();

      return res.status(400).json({
        message: "OTP expired. Please request a new verification code.",
      });
    }

    const isMatch = await bcrypt.compare(otp, user.otp.code);

    if (!isMatch) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;

      if (user.otpAttempts >= 5) {
        user.otp = undefined;
        user.lastOTPSentAt = undefined;
        user.otpAttempts = 0;
        await user.save();

        return res.status(429).json({
          message:
            "Too many invalid attempts. Please request a new verification code.",
        });
      }

      await user.save();

      return res.status(400).json({
        message: "Invalid OTP",
        remainingAttempts: 5 - user.otpAttempts,
      });
    }

    user.isVerified.email = true;
    user.otp = undefined;
    user.lastOTPSentAt = undefined;
    user.otpAttempts = 0;

    const { accessToken } = await createAuthSession(user, req, res);
    await user.populate("role", "name permissions allowedModules");
    await user.populate("collegeId", "name code emailDomains location");

    return res.status(200).json({
      message: "Email verified successfully",
      accessToken,
      user,
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return res.status(500).json({
      message: "Failed to verify OTP",
      error: error.message,
    });
  }
};

const resendOTP = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: normalizedEmail }).populate(
      "role",
      "name permissions allowedModules",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified?.email) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    if (
      user.lastOTPSentAt &&
      Date.now() - new Date(user.lastOTPSentAt).getTime() < 30 * 1000
    ) {
      return res.status(429).json({
        message: "Please wait before requesting another OTP",
      });
    }

    await sendVerificationOTPEmail(user, "verification");

    return res.status(200).json({
      message: "Verification OTP resent successfully",
    });
  } catch (error) {
    console.error("Resend OTP Error:", error);
    return res.status(500).json({
      message: "Failed to resend verification OTP",
      error: error.message,
    });
  }
};

/**
 * Unified login for all roles (student, teacher, alumni, admin, globalAdmin)
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: normalizedEmail,
    })
      .select("+password")
      .populate("role", "name permissions allowedModules");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        message: "Your account is blocked. Contact admin.",
      });
    }

    if (!user.isVerified.email) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const { accessToken } = await createAuthSession(user, req, res);

    const reply = {
      _id: user._id,

      name: user.name,

      email: user.email,

      phone: user.phone,

      role: user.role,

      profilePicture: user.profilePicture,

      bio: user.bio,
    };

    return res.status(200).json({
      message: "Login successful",

      accessToken,

      user: reply,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Login failed",

      error: err.message,
    });
  }
};

const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        message: "No refresh token",
      });
    }

    const payload = jwt.verify(refreshToken, process.env.JWT_KEY);

    const user = await User.findById(payload._id).populate(
      "role",
      "name permissions allowedModules",
    );

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    const exists = user.refreshTokens.some((rt) => rt.token === refreshToken);

    if (!exists) {
      return res.status(401).json({
        message: "Invalid refresh token",
      });
    }

    // ONLY CREATE NEW ACCESS TOKEN
    const accessToken = generateAccessToken(user);

    setAuthCookies(res, accessToken);

    return res.status(200).json({
      accessToken,
    });
  } catch {
    return res.status(401).json({
      message: "Refresh expired",
    });
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
      collegeId,
    } = req.body;

    if (!provider || !providerId || !email) {
      return res
        .status(400)
        .json({ message: "Missing required social login data" });
    }

    // 1️⃣ Check existing user
    let user = await User.findOne({
      email,
      provider,
      providerId,
    }).populate("role");

    // ================== LOGIN ==================
    if (user) {
      const { accessToken } = await createAuthSession(user, req, res);

      return res.status(200).json({
        message: "Social login successful",
        accessToken,
        user,
      });
    }

    // ================== SIGNUP ==================
    if (!roleName || !collegeId) {
      return res.status(400).json({
        message: "Role and college are required for first-time social login",
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
      isVerified: { email: true },
    });

    const { accessToken } = await createAuthSession(user, req, res);
    await user.populate("role", "name permissions allowedModules");

    res.status(201).json({
      message: "Account created via social login",
      accessToken,
      user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Social login failed",
      error: err.message,
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
        message: "No refresh token found",
      });
    }

    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 🧹 Remove current refresh token
    user.refreshTokens = user.refreshTokens.filter(
      (rt) => rt.token !== refreshToken,
    );

    await user.save();

    // ✅ Use token from middleware
    const accessToken = req.token;

    if (accessToken) {
      const decoded = jwt.decode(accessToken);
      const expiry = decoded.exp - Math.floor(Date.now() / 1000);

      if (redisClient.isReady) {
        await redisClient.setEx(`token:${accessToken}`, expiry, "blocked");
      }
    }

    // 🍪 Clear cookies
    res.clearCookie("refreshToken", clearAuthCookieOptions());

    res.clearCookie("token", clearAuthCookieOptions());

    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      message: "Logout failed",
      error: error.message,
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
      message: error.message,
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
        globalOptIn,
      },
      { new: true, runValidators: true },
    ).select("-password -refreshTokens");

    // 2️⃣ Update or Create UserProfile
    let profile = await UserProfile.findOne({ userId });

    if (profile) {
      // update existing
      profile = await UserProfile.findOneAndUpdate(
        { userId },
        req.body.profile, // { bio, dob, etc. }
        { new: true },
      );
    } else {
      // create new
      profile = await UserProfile.create({
        userId,
        ...req.body.profile,
      });
    }

    // 3️⃣ Response
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user,
        profile,
      },
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
    const normalizedEmail = normalizeEmail(req.body.email);
    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Hash token and save to user
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    // Email content
    const resetUrl = `${getFrontendURL(req)}/reset-password/${resetToken}`;
    const html = `
      <h3>Password Reset Request</h3>
      <p>Click the link below to reset your password. The link expires in 15 minutes:</p>
      <a href="${resetUrl}">${resetUrl}</a>
    `;

    await sendMail(user.email, "CampusConnect - Reset Password", html);

    res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)
      return res
        .status(400)
        .json({ message: "Token and new password are required" });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user by token and check expiry
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select("+password"); // include password for hashing

    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Clear reset fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.refreshTokens = [];

    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Server error" });
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
      { new: true },
    ).populate("role", "name permissions");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Role updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("ERROR:", error); // 👈 IMPORTANT
    res.status(500).json({ message: "Server error" });
  }
};

const getColleges = async (req, res) => {
  try {
    const colleges = await College.find({ isActive: true })
      .sort({ name: 1 })
      .select("name code location logoUrl emailDomains");

    res.status(200).json({
      success: true,
      colleges,
    });
  } catch (error) {
    console.error("Get Colleges Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch colleges",
    });
  }
};

const createCollege = async (req, res) => {
  try {
    const { name, code, location, logoUrl, emailDomains } = req.body;

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
      emailDomains: Array.isArray(emailDomains)
        ? emailDomains
            .map((domain) => String(domain).trim().toLowerCase())
            .filter(Boolean)
        : typeof emailDomains === "string"
          ? emailDomains
              .split(",")
              .map((domain) => domain.trim().toLowerCase())
              .filter(Boolean)
          : [],
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
    const updatedUser = await User.findById(req.user._id).populate(
      "collegeId",
      "name code location",
    );

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
  requestOTP,
  verifyOTP,
  resendOTP,
  loginUser,
  refreshAccessToken,
  socialLogin,
  logout,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  updateRole,
  updateClg,
  getColleges,
  createCollege,
  
};
