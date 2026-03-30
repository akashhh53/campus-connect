const mongoose = require("mongoose");


/* =========================
   USER SCHEMA
========================= */
const userSchema = new mongoose.Schema(
  {
    /* =========================
       BASIC INFO
    ========================= */
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    phone: {
  type: String,
  unique: true,
  sparse: true,
  trim: true,
  index: true,
},


    password: {
      type: String,
      select: false, // hide in queries by default
    },

    /* =========================
       SOCIAL LOGIN
    ========================= */
    provider: {
      type: String,
      enum: ["local", "google", "facebook"],
      default: "local",
    },
    providerId: {
      type: String, // e.g., Google/Facebook unique ID
      index: true,
      sparse: true,
    },
    profilePicture: String, // optional

    /* =========================
       PERSONAL INFO
    ========================= */
    dateOfBirth: {
      type: Date,
      required: true,
    },
    isDobPublic: {
      type: Boolean,
      default: true,
    },

    /* =========================
       ROLE & ORGANIZATION
    ========================= */
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
      index: true,
    },
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
      index: true,
    },

    /* =========================
       PLATFORM SETTINGS
    ========================= */
    globalOptIn: {
      type: Boolean,
      default: false,
    },

    isVerified: {
      email: { type: Boolean, default: false },
      phone: { type: Boolean, default: false },
    },

    isBlocked: {
      type: Boolean,
      default: false,
      index: true,
    },

    /* =========================
       OTP
    ========================= */
    otp: {
      code: { type: String, select: false },
      expiresAt: Date,
    },
    lastOTPSentAt: Date,
    otpAttempts: { type: Number, default: 0 },

    /* =========================
   PASSWORD RESET
========================= */
resetPasswordToken: { type: String, select: false },
resetPasswordExpire: Date,

    /* =========================
       REFRESH TOKENS
    ========================= */
    refreshTokens: [
      {
        token: String,
        createdAt: { type: Date, default: Date.now },
        ipAddress: String,
        userAgent: String,
      },
    ],

    /* =========================
       ACTIVITY
    ========================= */
    lastLoginAt: Date,
    lastActiveAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        if (!ret.isDobPublic) {
          delete ret.dateOfBirth;
          delete ret.age;
        }
        delete ret.password;
        delete ret.otp;
        delete ret.refreshTokens;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform(doc, ret) {
        if (!ret.isDobPublic) {
          delete ret.dateOfBirth;
          delete ret.age;
        }
        delete ret.password;
        delete ret.otp;
        delete ret.refreshTokens;
        return ret;
      },
    },
  }
);

/* =========================
   AGE VIRTUAL
========================= */
userSchema.virtual("age").get(function () {
  if (!this.dateOfBirth) return null;

  const today = new Date();
  let age = today.getFullYear() - this.dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - this.dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < this.dateOfBirth.getDate())) {
    age--;
  }

  return age;
});

/* =========================
   INDEXES
========================= */

userSchema.index({ "otp.expiresAt": 1 });


/* =========================
   EXPORT
========================= */
module.exports = mongoose.model("User", userSchema);

