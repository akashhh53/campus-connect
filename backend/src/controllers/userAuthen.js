const User = require('../models/User');
const AdminInvite = require('../models/AdminInvite');
const Role = require('../models/Role');
const validate = require('../utils/validate');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generateAccessToken, generateRefreshToken } = require('../utils/token');
const generateOTP = require('../utils/otp');
const sendMail = require('../utils/mailer');


//register global admin
const registerGlobalAdmin = async (req, res) => {
  try {
    const { name, email, password, phone, dateOfBirth } = req.body;

    // 1️⃣ Find or create the globalAdmin role
    let globalAdminRole = await Role.findOne({ name: "globalAdmin" });
    if (!globalAdminRole) {
      globalAdminRole = await Role.create({ name: "globalAdmin" });
    }

    // 2️⃣ Check if a global admin already exists
    const existingGlobalAdmin = await User.findOne({ role: globalAdminRole._id });
    if (existingGlobalAdmin) {
      return res.status(400).json({ message: "Global Admin already exists" });
    }

    // 3️⃣ Validate input (use dummy collegeId for schema requirement)
    try {
      validate({
        name,
        email,
        password,
        phone,
        dateOfBirth,
        role: globalAdminRole._id,
        collegeId: mongoose.Types.ObjectId("000000000000000000000000"), // dummy ObjectId
      });
    } catch (validationError) {
      return res.status(400).json({ message: "Validation failed", errors: validationError.message });
    }

    // 4️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5️⃣ Create global admin user
    const newGlobalAdmin = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      dateOfBirth,
      role: globalAdminRole._id,
      collegeId: mongoose.Types.ObjectId("000000000000000000000000"), // dummy ObjectId
      provider: "local",
      isVerified: { email: true },
    });

    // 6️⃣ Generate tokens
    const accessToken = generateAccessToken(newGlobalAdmin);
    const refreshToken = generateRefreshToken(newGlobalAdmin);

    // 7️⃣ Set refresh token cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // 8️⃣ Send response
    res.status(201).json({
      message: "Global Admin registered successfully",
      accessToken,
      user: newGlobalAdmin,
    });

  } catch (err) {
    console.error(err);

    // Duplicate key error (email or phone)
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({ message: `Duplicate ${field} detected`, value: err.keyValue[field] });
    }

    // Other errors
    res.status(500).json({ message: "Failed to register Global Admin", error: err.message });
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

    // 2️⃣ Find user by email and include password
    const user = await User.findOne({ email })
      .select("+password")
      .populate("role", "name permissions allowedModules"); // include role details

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 3️⃣ Check if user is blocked
    if (user.isBlocked) {
      return res.status(403).json({ message: "Your account is blocked. Contact admin." });
    }

    // 4️⃣ Optional: Check if email is verified
    if (!user.isVerified.email) {
      return res.status(403).json({ message: "Please verify your email before logging in" });
    }

    // 5️⃣ Compare passwords
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 6️⃣ Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // 7️⃣ Manage refresh tokens array (keep latest 5)
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

    // 9️⃣ Set refresh token cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true, // set false if testing on localhost without HTTPS
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // 10️⃣ Send clean user info
    const reply = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role, // includes role name, permissions, allowedModules
    };

    res.status(200).json({
      message: "Login successful",
      accessToken,
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
      provider,       // google | github | linkedin
      providerId,     // unique id from provider
      email,
      name,
      avatar,
      role: roleName, // only required on FIRST signup
      collegeId       // required on FIRST signup
    } = req.body;

    if (!provider || !providerId || !email) {
      return res.status(400).json({ message: "Missing required social login data" });
    }

    // 1️⃣ Check if user already exists
    let user = await User.findOne({
      email,
      provider,
      providerId
    }).populate("role");

    // 2️⃣ If user exists → LOGIN
    if (user) {
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return res.status(200).json({
        message: "Social login successful",
        accessToken,
        user
      });
    }

    // 3️⃣ First-time social signup → role required
    if (!roleName || !collegeId) {
      return res.status(400).json({
        message: "Role and college are required for first-time social login"
      });
    }

    // 4️⃣ Find role
    const role = await Role.findOne({ name: roleName });
    if (!role) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // 5️⃣ Create new social user
    user = await User.create({
      name,
      email,
      avatar,
      provider,
      providerId,
      role: role._id,
      collegeId,
      isVerified: { email: true } // social emails are verified
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
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





module.exports = {
  sendAdminInvite,
  acceptAdminInvite,
  registerGlobalAdmin,
  registerUser,
  loginUser,
  socialLogin
};





